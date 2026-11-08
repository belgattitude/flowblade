import { setTimeout as sleep } from "node:timers/promises";

import type {
  TransactionalDatasourceInterface,
  TransactionDatasourceInterface,
} from "@flowblade/core";
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
import {
  KyselyDatasource,
  type KyselyDatasourceDefaultOptions,
} from "./kysely-datasource.ts";

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

type Handler = (
  query: CompiledQuery,
  signal?: AbortSignal
) => Promise<QueryResult<unknown>>;

/**
 * Kysely connected to a fake driver recording the statements, the queries
 * results come from `handler`.
 */
const createDatasource = (
  params: {
    handler?: Handler;
    failOn?: Partial<Record<"begin" | "commit" | "rollback", Error>>;
    /**
     * Driver methods left out, ie: no savepoint support
     */
    unsupported?: ("savepoint" | "rollbackToSavepoint" | "releaseSavepoint")[];
    /**
     * Awaited when acquiring a connection, ie: an exhausted pool
     */
    acquire?: () => Promise<void>;
    defaultOptions?: KyselyDatasourceDefaultOptions;
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

  const inTransaction = new WeakSet<DatabaseConnection>();
  const createConnection = (): DatabaseConnection => {
    const connection: DatabaseConnection = {
      executeQuery: async <R>(
        query: CompiledQuery,
        options?: { signal?: AbortSignal }
      ) => {
        calls.push(query.sql);
        return (await handler(query, options?.signal)) as QueryResult<R>;
      },
      async *streamQuery<R>(query: CompiledQuery) {
        const where = inTransaction.has(connection) ? "in" : "outside";
        calls.push(`stream ${where} transaction: ${query.sql}`);
        yield { rows: [{ id: 1, name: "p1" }] } as QueryResult<R>;
      },
    };
    return connection;
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
    acquireConnection: async () => {
      await params.acquire?.();
      return createConnection();
    },
    beginTransaction: async (conn, s) => {
      inTransaction.add(conn);
      settings.push(s);
      await step("begin");
    },
    commitTransaction: () => step("commit"),
    rollbackTransaction: () => step("rollback"),
    // the generated savepoint names are left out: unique in the process
    savepoint: async () => {
      calls.push("savepoint");
    },
    rollbackToSavepoint: async () => {
      calls.push("rollback to savepoint");
    },
    releaseSavepoint: async () => {
      calls.push("release savepoint");
    },
    releaseConnection: async () => {
      released++;
    },
    destroy: async () => {},
  };
  const unsupported = new Set<string>(params.unsupported);
  const dialectDriver = Object.fromEntries(
    Object.entries(driver).filter(([method]) => !unsupported.has(method))
  ) as unknown as Driver;
  const db = new Kysely<Database>({
    dialect: {
      createAdapter: () => new MultiConnectionAdapter(),
      createDriver: () => dialectDriver,
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
    defaultOptions: params.defaultOptions,
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
    it("should classify a domain rollback and preserve its details", async () => {
      const { ds, calls } = createDatasource();
      const domainError = new QErrors.DomainRollback("OUT_OF_STOCK", {
        details: { productId: 1 },
      });
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(insertProduct(tx, 1));
        throw domainError;
      });

      expect(result.error?.code).toBe("DOMAIN_ROLLBACK");
      expect(result.error).toMatchObject({
        reason: "OUT_OF_STOCK",
        details: { productId: 1 },
      });
      if (result.error?.code === "DOMAIN_ROLLBACK") {
        expectTypeOf(result.error.reason).toEqualTypeOf<string>();
        expectTypeOf(result.error.details).toEqualTypeOf<unknown>();
        expectTypeOf(result.error.cause).toEqualTypeOf<
          QErrors.DomainRollback | undefined
        >();
      }
      expect(result.error?.cause).toBe(domainError);
      expect(calls.at(-1)).toBe("rollback");
      expect(calls).not.toContain("commit");
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
    });

    it("should rethrow a domain rollback from transactionOrThrow", async () => {
      const { ds } = createDatasource();
      const domainError = new QErrors.DomainRollback("OUT_OF_STOCK");
      await expect(
        ds.transactionOrThrow(async () => {
          throw domainError;
        })
      ).rejects.toBe(domainError);
    });

    it("should retry the conflicts with defaultOptions.transaction.retry", async () => {
      const conflict = Object.assign(new Error("could not serialize access"), {
        code: "40001",
      });
      const delayMs = vi.fn<(retry: number) => number>(() => 0);
      const { ds, calls } = createDatasource({
        handler: async () => {
          throw conflict;
        },
        defaultOptions: { transaction: { retry: { maxRetries: 2, delayMs } } },
      });
      const fn = async (tx: KyselyTransactionDatasource<Database>) => {
        await tx.queryOrThrow(insertProduct(tx, 1));
      };
      const result = await ds.transaction(fn);
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      expect(calls.filter((call) => call === "begin")).toHaveLength(3);
      expect(delayMs.mock.calls).toStrictEqual([[1], [2]]);
      expect(result.meta.getSpans()[0]).toMatchObject({ retries: 2 });

      // the per call retry fields win, the default delayMs is kept
      calls.length = 0;
      await ds
        .transactionOrThrow(fn, { retry: { maxRetries: 1 } })
        .catch(() => undefined);
      expect(calls.filter((call) => call === "begin")).toHaveLength(2);
      expect(delayMs).toHaveBeenCalledTimes(3);
    });

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
      expect(result.error).toMatchObject({
        message: "Query failed: UNIQUE constraint failed",
        code: "ROLLED_BACK",
        cause: expect.any(QErrors.QueryFailed),
      });
      expect(result.error).toBeInstanceOf(QErrors.RolledBack);
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
      expect(result.error).toMatchObject({
        message: "connection refused",
        code: "TRANSACTION_FAILED",
        cause: beginError,
      });
      expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
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
      expect(result.error).toMatchObject({
        message: "deadlock",
        code: "TRANSACTION_FAILED",
        cause: commitError,
      });
      expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
    });

    it("should preserve the callback error if SQL Server already rolled back", async () => {
      const rollbackError = Object.assign(
        new Error("No corresponding BEGIN TRANSACTION"),
        { number: 3903 }
      );
      const { ds, calls, getReleased } = createDatasource({
        failOn: { rollback: rollbackError },
      });
      const domainError = new QErrors.DomainRollback("OUT_OF_STOCK", {
        details: { productId: 7 },
      });

      const result = await ds.transaction(async () => {
        throw domainError;
      });

      expect(calls).toStrictEqual(["begin", "rollback"]);
      expect(getReleased()).toBe(1);
      expect(result.error).toBeInstanceOf(QErrors.TransactionDomainRollback);
      expect(result.error).toMatchObject({
        code: "DOMAIN_ROLLBACK",
        reason: "OUT_OF_STOCK",
        details: { productId: 7 },
        cause: domainError,
      });
    });

    it("should report other rollback errors as transaction failures", async () => {
      const rollbackError = Object.assign(new Error("rollback failed"), {
        number: 50000,
      });
      const { ds } = createDatasource({
        failOn: { rollback: rollbackError },
      });
      const callbackError = new Error("callback failed");

      const result = await ds.transaction(async () => {
        throw callbackError;
      });

      expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
      expect(result.error).toMatchObject({
        code: "TRANSACTION_FAILED",
        cause: expect.objectContaining({
          errors: [rollbackError, callbackError],
        }),
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

    it("should abort an in-flight query with the transaction signal", async () => {
      const txController = new AbortController();
      let driverSignalAborted: boolean | undefined;
      const { ds } = createDatasource({
        handler: async (_query, signal) => {
          txController.abort(new Error("transaction aborted"));
          driverSignalAborted = signal?.aborted;
          signal?.throwIfAborted();
          return { rows: [] };
        },
      });
      const result = await ds.transaction(
        async (tx) => {
          // the query has its own signal: combined with the transaction one
          const { error } = await tx.query(insertProduct(tx, 1), {
            signal: new AbortController().signal,
          });
          return error?.code;
        },
        { signal: txController.signal }
      );
      expect(driverSignalAborted).toBe(true);
      expect(result.error?.code).toBe("ABORTED");
      expect(result.error?.cause).toBe(txController.signal.reason);
    });

    it("should not wait for a connection once aborted", async () => {
      const controller = new AbortController();
      const acquired = Promise.withResolvers<undefined>();
      const { ds, calls, getReleased } = createDatasource({
        // ie: an exhausted pool
        acquire: async () => {
          await acquired.promise;
        },
      });
      const fn = vi.fn<() => Promise<number>>(async () => 1);
      const transaction = ds.transaction(fn, { signal: controller.signal });
      await sleep(5);
      controller.abort(new Error("client gone"));
      const result = await transaction;
      expect(result.error?.code).toBe("ABORTED");
      expect(result.error?.cause).toBe(controller.signal.reason);
      // the connection acquired late: rolled back, the callback never runs
      acquired.resolve(undefined);
      await vi.waitFor(() => {
        expect(getReleased()).toBe(1);
      });
      expect(calls).toStrictEqual(["begin", "rollback"]);
      expect(fn).not.toHaveBeenCalled();
    });

    it("should stream in the transaction, whatever the query builder", async () => {
      const { ds, calls } = createDatasource();
      await ds.transactionOrThrow(async (tx) => {
        // built with the parent datasource builder
        const rows = await Array.fromAsync(
          tx.stream(ds.queryBuilder.selectFrom("product").selectAll())
        );
        expect(rows).toStrictEqual([{ id: 1, name: "p1" }]);
      });
      expect(calls).toStrictEqual([
        "begin",
        'stream in transaction: select * from "product"',
        "commit",
      ]);
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
      expect(result.error).toMatchObject({
        message:
          "A query failed in the transaction, it can't be committed: current transaction is aborted",
        code: "TRANSACTION_FAILED",
        cause: driverError,
      });
      expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
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

    it("should wait for the queries not awaited by the callback", async () => {
      const { ds, calls } = createDatasource({
        handler: async () => {
          await sleep(20);
          return { rows: [] };
        },
      });
      const result = await ds.transaction(async (tx) => {
        // not awaited (a bug): the commit still waits for it
        void tx.query(insertProduct(tx, 1));
      });
      expect(result.error).toBeUndefined();
      expect(calls).toStrictEqual([
        "begin",
        'insert into "product" ("id", "name") values (?, ?)',
        "commit",
      ]);
      expect(result.meta.getSpansByType("sql")).toHaveLength(1);
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

  describe("savepoint", () => {
    it("should release the savepoint", async () => {
      const { ds, calls } = createDatasource();
      const result = await ds.transaction(async (tx) => {
        const sp = await tx.savepoint(
          async (inner) => {
            await inner.queryOrThrow(insertProduct(inner, 1));
            return 1;
          },
          { name: "insertProduct" }
        );
        expectTypeOf(sp.data).toEqualTypeOf<number | undefined>();
        return sp;
      });
      expect(result.error).toBeUndefined();
      expect(calls).toStrictEqual([
        "begin",
        "savepoint",
        'insert into "product" ("id", "name") values (?, ?)',
        "release savepoint",
        "commit",
      ]);
      expect(result.data?.data).toBe(1);
      expect(result.data?.meta.getSpans()[0]).toMatchObject({
        type: "savepoint",
        name: "insertProduct",
        status: "released",
      });
    });

    it("should roll back the savepoint only after a failed query", async () => {
      const driverError = new Error("UNIQUE constraint failed");
      const { ds, calls } = createDatasource({
        handler: async (query) => {
          if (query.parameters[0] === 1) {
            throw driverError;
          }
          return { rows: [] };
        },
      });
      const result = await ds.transaction(async (tx) => {
        const { error } = await tx.savepoint((sp) =>
          sp.queryOrThrow(insertProduct(sp, 1))
        );
        await tx.queryOrThrow(insertProduct(tx, 2));
        return error;
      });
      // the transaction goes on and commits
      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({ code: "ROLLED_BACK" });
      expect(calls).toStrictEqual([
        "begin",
        "savepoint",
        'insert into "product" ("id", "name") values (?, ?)',
        "rollback to savepoint",
        'insert into "product" ("id", "name") values (?, ?)',
        "commit",
      ]);
    });

    it("should support nested savepoints and savepointOrThrow", async () => {
      const { ds, calls } = createDatasource();
      await ds.transactionOrThrow(async (tx) => {
        await tx.savepointOrThrow(async (outer) => {
          await expect(
            outer.savepointOrThrow(async () => {
              throw new QErrors.NoResult();
            })
          ).rejects.toBeInstanceOf(QErrors.NoResult);
        });
      });
      expect(calls).toStrictEqual([
        "begin",
        "savepoint",
        "savepoint",
        "rollback to savepoint",
        "release savepoint",
        "commit",
      ]);
    });

    it("should fail when the dialect doesn't support savepoints", async () => {
      const { ds, calls } = createDatasource({
        unsupported: ["savepoint", "rollbackToSavepoint", "releaseSavepoint"],
      });
      let savepointMessage: string | undefined;
      const result = await ds.transaction(async (tx) => {
        const sp = await tx.savepoint(async () => 1);
        savepointMessage = sp.error?.message;
      });
      expect(savepointMessage).toBe(
        "The `savepoint` method is not supported by this driver"
      );
      // the transaction can't be committed
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      expect(calls.at(-1)).toBe("rollback");
    });

    it("should skip the release when not supported (ie: sql server)", async () => {
      const { ds, calls } = createDatasource({
        unsupported: ["releaseSavepoint"],
      });
      const result = await ds.transaction(async (tx) => {
        const sp = await tx.savepoint(async () => 1);
        return sp.data;
      });
      expect(result.error).toBeUndefined();
      expect(result.data).toBe(1);
      expect(calls).toStrictEqual(["begin", "savepoint", "commit"]);
    });

    it("should not be available outside of a transaction", () => {
      const { ds } = createDatasource();
      expect(ds).not.toHaveProperty("savepoint");
      // @ts-expect-error - transactions only
      expectTypeOf(ds.savepoint).toBeUndefined();
    });
  });

  describe("TransactionalDatasourceInterface", () => {
    /**
     * Works with any transactional datasource
     */
    const runAll = async (
      ds: TransactionalDatasourceInterface,
      queries: unknown[]
    ) =>
      await ds.transactionOrThrow(async (tx) => {
        expectTypeOf(tx).toEqualTypeOf<TransactionDatasourceInterface>();
        for (const query of queries) {
          // oxlint-disable-next-line no-await-in-loop -- sequential on purpose
          await tx.queryOrThrow(query);
        }
        return queries.length;
      });

    it("should be implemented by the datasource", async () => {
      const { ds, calls } = createDatasource();
      expectTypeOf(ds).toExtend<TransactionalDatasourceInterface>();
      const { data } = await runAll(ds, [sql`select 1`, sql`select 2`]);
      expect(data).toBe(2);
      expect(calls).toStrictEqual(["begin", "select 1", "select 2", "commit"]);
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
