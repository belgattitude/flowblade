import {
  type CompiledQuery,
  type DatabaseConnection,
  type Driver,
  Kysely,
  type QueryResult,
  sql,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type TransactionSettings,
} from "kysely";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { KyselyTransactionDatasource } from "../index.ts";
import { QErrors } from "../index.ts";
import { KyselyDatasource } from "./kysely-datasource.ts";

type Database = {
  product: { id: number; name: string };
};

/**
 * Like a pooled dialect (ie: mssql, postgres): the SqliteAdapter holds a
 * mutex on its single connection for the whole transaction.
 */
class MultiConnectionAdapter extends SqliteAdapter {
  // oxlint-disable-next-line class-methods-use-this -- overrides the adapter getter
  override get supportsMultipleConnections(): boolean {
    return true;
  }
}

type Handler = (query: CompiledQuery) => Promise<QueryResult<unknown>>;

/**
 * Kysely connected to a fake driver recording the statements, the queries
 * results come from `handler`.
 */
const createDatasource = (
  params: {
    handler?: Handler;
    failOn?: Partial<Record<"begin" | "commit" | "rollback", Error>>;
  } = {}
) => {
  const {
    handler = async () => {
      return { rows: [] };
    },
    failOn = {},
  } = params;
  const calls: string[] = [];
  const settings: TransactionSettings[] = [];
  let released = 0;

  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      calls.push(query.sql);
      return (await handler(query)) as QueryResult<R>;
    },
    // oxlint-disable-next-line require-yield -- never streamed
    async *streamQuery() {
      throw new Error("not implemented");
    },
  };
  const step = async (name: "begin" | "commit" | "rollback") => {
    calls.push(name);
    const error = failOn[name];
    if (error !== undefined) {
      throw error;
    }
  };
  const driver: Driver = {
    init: async () => {},
    acquireConnection: async () => connection,
    beginTransaction: async (_conn, s) => {
      settings.push(s);
      await step("begin");
    },
    commitTransaction: () => step("commit"),
    rollbackTransaction: () => step("rollback"),
    releaseConnection: async () => {
      released++;
    },
    destroy: async () => {},
  };
  const db = new Kysely<Database>({
    dialect: {
      createAdapter: () => new MultiConnectionAdapter(),
      createDriver: () => driver,
      createIntrospector: (k) => new SqliteIntrospector(k),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
  });
  const logger = {
    debug: vi.fn<(message: string, properties?: unknown) => void>(),
    info: vi.fn<(message: string, properties?: unknown) => void>(),
    error: vi.fn<(message: string, properties?: unknown) => void>(),
    warn: vi.fn<(message: string, properties?: unknown) => void>(),
  };
  const ds = new KyselyDatasource<Database>({
    connection: db,
    logger: logger as never,
  });
  return {
    ds,
    calls,
    settings,
    logger,
    getReleased: () => released,
  };
};

const insertProduct = (tx: KyselyTransactionDatasource<Database>, id: number) =>
  tx.queryBuilder.insertInto("product").values({ id, name: `p${id}` });

describe("KyselyDatasource transactions", () => {
  describe("transaction", () => {
    it("should run the queries in a committed transaction", async () => {
      const { ds, calls, settings, getReleased } = createDatasource({
        handler: async (query) =>
          query.sql.startsWith("select")
            ? { rows: [{ id: 1, name: "p1" }] }
            : { rows: [], numAffectedRows: 1n },
      });
      const result = await ds.transaction(
        async (tx) => {
          await tx.queryOrThrow(insertProduct(tx, 1));
          const { data } = await tx.queryOneOrThrow(
            tx.queryBuilder.selectFrom("product").selectAll()
          );
          return data;
        },
        {
          name: "createProduct",
          isolationLevel: "serializable",
          accessMode: "read write",
        }
      );
      expect(calls).toStrictEqual([
        "begin",
        'insert into "product" ("id", "name") values (?, ?)',
        'select * from "product"',
        "commit",
      ]);
      expect(settings).toStrictEqual([
        { isolationLevel: "serializable", accessMode: "read write" },
      ]);
      expect(getReleased()).toBe(1);
      expect(result.error).toBeUndefined();
      expect(result.data).toStrictEqual({ id: 1, name: "p1" });
      expectTypeOf(result.data).toEqualTypeOf<
        { id: number; name: string } | undefined
      >();
      expect(result.meta.name).toBe("createProduct");
      expect(result.meta.getSpans().map((s) => s.type)).toStrictEqual([
        "transaction",
        "sql",
        "sql",
      ]);
      expect(result.meta.getSpans()[0]).toMatchObject({
        type: "transaction",
        status: "committed",
        isolationLevel: "serializable",
        accessMode: "read write",
      });
      expect(result.meta.getSpansByType("sql")[0]).toMatchObject({
        affectedRows: 1,
        params: [1, "p1"],
      });
    });

    it("should not run the queries of the datasource in the transaction", async () => {
      const { ds } = createDatasource();
      const result = await ds.transaction(async () => {
        // the parent datasource: not part of the transaction meta
        await ds.queryOrThrow(sql`select 1`);
      });
      expect(result.meta.getSpansByType("sql")).toHaveLength(0);
    });

    it("should roll back with ROLLED_BACK when a query fails", async () => {
      const driverError = new Error("UNIQUE constraint failed");
      const { ds, calls, logger, getReleased } = createDatasource({
        handler: async (query) => {
          if (query.parameters[0] === 2) {
            throw driverError;
          }
          return { rows: [] };
        },
      });
      const result = await ds.transaction(
        async (tx) => {
          await tx.queryOrThrow(insertProduct(tx, 1));
          await tx.queryOrThrow(insertProduct(tx, 2));
          await tx.queryOrThrow(insertProduct(tx, 3));
        },
        { name: "createProducts" }
      );
      expect(calls.at(-1)).toBe("rollback");
      expect(calls).not.toContain("commit");
      expect(calls).toHaveLength(4);
      expect(getReleased()).toBe(1);
      expect(result.error).toStrictEqual({
        message: "Query failed: UNIQUE constraint failed",
        code: "ROLLED_BACK",
        cause: expect.any(QErrors.QueryFailed),
      });
      expect(result.error?.cause).toHaveProperty("cause", driverError);
      // the failed query span is kept
      expect(result.meta.getSpansByType("sql")).toHaveLength(2);
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Transaction "{transactionName}" rolled back: {errorMessage}',
        expect.objectContaining({
          transactionName: "createProducts",
          status: "rolled back",
          queryCount: 2,
        })
      );
    });

    it("should roll back with tx.rollback()", async () => {
      const { ds, calls } = createDatasource();
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(insertProduct(tx, 1));
        tx.rollback("out of stock");
      });
      expect(calls.at(-1)).toBe("rollback");
      expect(result.error?.code).toBe("ROLLED_BACK");
      expect(result.error?.message).toBe(
        "Transaction rolled back: out of stock"
      );
      expect(result.error?.cause).toBeInstanceOf(QErrors.RolledBack);
    });

    it("should return TRANSACTION_FAILED when begin fails", async () => {
      const beginError = new Error("connection refused");
      const { ds, getReleased, logger } = createDatasource({
        failOn: { begin: beginError },
      });
      const fn = vi.fn<() => Promise<void>>();
      const result = await ds.transaction(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(getReleased()).toBe(1);
      expect(result.error).toStrictEqual({
        message: "connection refused",
        code: "TRANSACTION_FAILED",
        cause: beginError,
      });
      expect(logger.error).toHaveBeenCalledOnce();
    });

    it("should roll back and release the connection when commit fails", async () => {
      const commitError = new Error("deadlock");
      const { ds, calls, getReleased } = createDatasource({
        failOn: { commit: commitError },
      });
      const result = await ds.transaction(async () => 1);
      expect(calls).toStrictEqual(["begin", "commit", "rollback"]);
      expect(getReleased()).toBe(1);
      expect(result.error).toStrictEqual({
        message: "deadlock",
        code: "TRANSACTION_FAILED",
        cause: commitError,
      });
    });

    it("should abort the queries and roll back with the transaction signal", async () => {
      const controller = new AbortController();
      const { ds, calls } = createDatasource({
        handler: async () => {
          controller.abort(new Error("client gone"));
          return { rows: [] };
        },
      });
      const result = await ds.transaction(
        async (tx) => {
          await tx.query(insertProduct(tx, 1));
          return 1;
        },
        { signal: controller.signal }
      );
      expect(calls.at(-1)).toBe("rollback");
      expect(result.error?.code).toBe("ABORTED");
      expect(result.error?.cause).toBe(controller.signal.reason);
    });

    it("should combine the query signal with the transaction one", async () => {
      const controller = new AbortController();
      controller.abort(new Error("query aborted"));
      const { ds, calls } = createDatasource();
      const txController = new AbortController();
      let queryErrorCode: string | undefined;
      const result = await ds.transaction(
        async (tx) => {
          const { error } = await tx.query(insertProduct(tx, 1), {
            signal: controller.signal,
          });
          queryErrorCode = error?.code;
        },
        { signal: txController.signal }
      );
      expect(queryErrorCode).toBe("ABORTED");
      // a failed query, even handled, is never committed
      expect(calls.at(-1)).toBe("rollback");
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
    });

    it("should roll back rather than commit after a handled failed query", async () => {
      const driverError = new Error("current transaction is aborted");
      const { ds, calls, getReleased } = createDatasource({
        handler: async (query) => {
          if (query.parameters[0] === 2) {
            throw driverError;
          }
          return { rows: [] };
        },
      });
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(insertProduct(tx, 1));
        // never throws, handled by the callback
        const { error } = await tx.query(insertProduct(tx, 2));
        return error?.code;
      });
      expect(calls).not.toContain("commit");
      expect(calls.at(-1)).toBe("rollback");
      expect(getReleased()).toBe(1);
      expect(result.error).toStrictEqual({
        message:
          "A query failed in the transaction, it can't be committed: current transaction is aborted",
        code: "TRANSACTION_FAILED",
        cause: driverError,
      });
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      await expect(
        ds.transactionOrThrow(async (tx) => {
          await tx.queryOrThrow(insertProduct(tx, 2)).catch(() => undefined);
        })
      ).rejects.toThrow(QErrors.TransactionFailed);
    });

    it("should reject the queries of a transaction datasource kept after the end", async () => {
      const { ds, calls } = createDatasource();
      let kept: KyselyTransactionDatasource<Database> | undefined;
      await ds.transactionOrThrow(async (tx) => {
        kept = tx;
      });
      const { error } = await kept!.query(insertProduct(kept!, 1));
      expect(error?.code).toBe("QUERY_FAILED");
      expect(error?.message).toBe(
        "The transaction has ended, run its queries in the callback and await them"
      );
      expect(calls).toStrictEqual(["begin", "commit"]);
    });

    it("should not support nested transactions", async () => {
      const { ds } = createDatasource();
      const result = await ds.transaction(async (tx) => {
        // @ts-expect-error - not exposed on the transaction datasource
        const nested = await (tx as KyselyDatasource<Database>).transaction(
          async () => 1
        );
        return nested.error;
      });
      expect(result.data).toMatchObject({
        code: "TRANSACTION_FAILED",
        message: expect.stringContaining("Nested transactions"),
      });
    });
  });

  describe("transactionOrThrow", () => {
    it("should return the callback value and meta", async () => {
      const { ds } = createDatasource();
      const { data, meta } = await ds.transactionOrThrow(async () => {
        return {
          id: 1,
        };
      });
      expect(data).toStrictEqual({ id: 1 });
      expectTypeOf(data).toEqualTypeOf<{ id: number }>();
      expect(meta.getSpans()[0]).toMatchObject({ status: "committed" });
    });

    it("should rethrow the error thrown by the callback as is", async () => {
      const { ds, calls } = createDatasource();
      const thrown = new QErrors.NoResult();
      await expect(
        ds.transactionOrThrow(async () => {
          throw thrown;
        })
      ).rejects.toBe(thrown);
      expect(calls.at(-1)).toBe("rollback");
    });

    it("should throw a RolledBack on tx.rollback()", async () => {
      const { ds } = createDatasource();
      await expect(
        ds.transactionOrThrow(async (tx) => tx.rollback("nope"))
      ).rejects.toThrow(new QErrors.RolledBack("nope"));
    });

    it("should throw a TransactionFailed when commit fails", async () => {
      const { ds } = createDatasource({
        failOn: { commit: new Error("deadlock") },
      });
      await expect(ds.transactionOrThrow(async () => 1)).rejects.toThrow(
        QErrors.TransactionFailed
      );
    });

    it("should throw the onError factory error", async () => {
      const { ds } = createDatasource({
        failOn: { commit: new Error("deadlock") },
      });
      await expect(
        ds.transactionOrThrow(async () => 1, {
          onError: ({ qError }) => new Error(`custom: ${qError.code}`),
        })
      ).rejects.toThrow("custom: TRANSACTION_FAILED");
    });
  });
});
