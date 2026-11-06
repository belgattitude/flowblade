import { setTimeout as sleep } from "node:timers/promises";

import { DuckDBInstance } from "@duckdb/node-api";
import type {
  TransactionalDatasourceInterface,
  TransactionDatasourceInterface,
} from "@flowblade/core";
import { describe, expect, expectTypeOf, vi } from "vitest";

import { duckTest } from "../../tests/utils/duck-test.ts";
import {
  DuckdbDatasource,
  type DuckdbTransactionDatasource,
  QErrors,
  sql,
  withConnectionLock,
} from "../index.ts";

const flush = () => sleep(10);

/**
 * A promise to pause a transaction callback until `resume()` is called.
 */
const createGate = () => {
  const { promise, resolve } = Promise.withResolvers<boolean>();
  return { paused: promise, resume: () => resolve(true) };
};

// A `product` table created for each test
const it = duckTest.extend("ds", async ({ ds }) => {
  await ds.queryOrThrow(sql`CREATE TABLE product (id INTEGER PRIMARY KEY)`);
  return ds;
});

const insert = (tx: DuckdbTransactionDatasource, id: number) =>
  tx.queryOrThrow(sql`INSERT INTO product VALUES (${id}::INTEGER)`);

const getIds = async (ds: DuckdbDatasource) => {
  const { data } = await ds.queryOrThrow(
    sql<{ id: number }>`SELECT id FROM product ORDER BY id`
  );
  return data.map((row) => row.id);
};

describe("DuckdbDatasource transactions", () => {
  describe("transaction", () => {
    it("should commit the queries", async ({ ds }) => {
      const result = await ds.transaction(
        async (tx) => {
          await insert(tx, 1);
          await insert(tx, 2);
          const { data } = await tx.queryOneOrThrow(
            sql<{
              count: number;
            }>`SELECT count(*)::INTEGER as count FROM product`
          );
          return data.count;
        },
        { name: "insertProducts" }
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toBe(2);
      expectTypeOf(result.data).toEqualTypeOf<number | undefined>();
      await expect(getIds(ds)).resolves.toStrictEqual([1, 2]);
      expect(result.meta.name).toBe("insertProducts");
      expect(result.meta.getSpans().map((span) => span.type)).toStrictEqual([
        "transaction",
        "sql",
        "sql",
        "sql",
      ]);
      expect(result.meta.getSpans()[0]).toMatchObject({ status: "committed" });
    });

    it("should stream in the transaction", async ({ ds }) => {
      const { data } = await ds.transactionOrThrow(async (tx) => {
        await insert(tx, 1);
        const ids: number[] = [];
        for await (const row of tx.stream(
          sql<{ id: number }>`SELECT id FROM product`
        )) {
          ids.push(row.id);
        }
        return ids;
      });
      expect(data).toStrictEqual([1]);
    });

    it("should roll back when a query throws", async ({ ds }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        await insert(tx, 1);
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      expect(result.error?.cause).toBeInstanceOf(QErrors.QueryFailed);
      expect(result.error?.message).toContain("PRIMARY KEY");
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should roll back with tx.rollback()", async ({ ds }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        tx.rollback("changed my mind");
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      expect(result.error?.message).toBe(
        "Transaction rolled back: changed my mind"
      );
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should not commit after a failed query, DuckDB aborted the transaction", async ({
      ds,
    }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        // never throws, but DuckDB aborts the transaction
        const { error } = await tx.query(
          sql`INSERT INTO product VALUES (1::INTEGER)`
        );
        return error?.code;
      });
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      expect(result.error?.message).toContain(
        "A query failed in the transaction, it can't be committed"
      );
      // the DuckDB error
      expect(result.error?.cause).toHaveProperty(
        "message",
        expect.stringContaining("PRIMARY KEY")
      );
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      await expect(getIds(ds)).resolves.toStrictEqual([]);
      // the connection is usable again
      await expect(
        ds.transactionOrThrow(async (tx) => await insert(tx, 2))
      ).resolves.toBeDefined();
      await expect(getIds(ds)).resolves.toStrictEqual([2]);
    });

    it("should ignore onFailedQuery commit, DuckDB aborted the transaction", async ({
      ds,
    }) => {
      const result = await ds.transaction(
        async (tx) => {
          await insert(tx, 1);
          await tx.query(sql`INSERT INTO product VALUES (1::INTEGER)`);
        },
        // @ts-expect-error - not supported by DuckDB
        { onFailedQuery: "commit" }
      );
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should not commit after a caught failed query", async ({ ds }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        await insert(tx, 1).catch(() => undefined);
      });
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should reject the queries of a transaction datasource kept after the end", async ({
      ds,
    }) => {
      let kept: DuckdbTransactionDatasource | undefined;
      await ds.transactionOrThrow(async (tx) => {
        kept = tx;
      });
      const { paused, resume } = createGate();
      const second = ds.transaction(async (tx) => {
        await insert(tx, 1);
        await paused;
      });
      await flush();
      // would otherwise run in the second transaction, without the lock
      const { error } = await kept!.query(
        sql`INSERT INTO product VALUES (2::INTEGER)`
      );
      expect(error?.code).toBe("QUERY_FAILED");
      expect(error?.message).toContain("The transaction has ended");
      await expect(async () => {
        for await (const _row of kept!.stream(sql`SELECT 1`)) {
          // never reached
        }
      }).rejects.toThrow("The transaction has ended");
      resume();
      const { error: secondError } = await second;
      expect(secondError).toBeUndefined();
      await expect(getIds(ds)).resolves.toStrictEqual([1]);
    });

    it("should wait for the queries not awaited by the callback", async ({
      ds,
    }) => {
      const result = await ds.transaction(async (tx) => {
        // not awaited (a bug): the commit still waits for it
        void tx.query(
          sql`INSERT INTO product SELECT range::INTEGER FROM range(100000)`
        );
      });
      expect(result.error).toBeUndefined();
      expect(result.meta.getSpansByType("sql")).toHaveLength(1);
      const { data } = await ds.queryOneOrThrow(
        sql<{ count: number }>`SELECT count(*)::INTEGER as count FROM product`
      );
      expect(data.count).toBe(100_000);
    });

    it("should run read only transactions", async ({ ds }) => {
      const result = await ds.transaction((tx) => insert(tx, 1), {
        accessMode: "read only",
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      expect(result.error?.message).toContain("read-only");
      expect(result.meta.getSpans()[0]).toMatchObject({
        accessMode: "read only",
      });
    });

    it("should reject isolation levels", async ({ ds }) => {
      const fn = vi.fn<() => Promise<void>>();
      const result = await ds.transaction(fn, {
        // @ts-expect-error - not supported by DuckDB
        isolationLevel: "serializable",
      });
      expect(fn).not.toHaveBeenCalled();
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      expect(result.error?.message).toContain("isolation levels");
    });

    it("should not support nested transactions", async ({ ds }) => {
      const { data } = await ds.transactionOrThrow(async (tx) => {
        // @ts-expect-error - not exposed on the transaction datasource
        const nested = await (tx as DuckdbDatasource).transaction(
          async () => 1
        );
        return nested.error;
      });
      expect(data).toMatchObject({
        code: "TRANSACTION_FAILED",
        message: expect.stringContaining("Nested transactions"),
      });
    });
  });

  describe("connection lock", () => {
    it("should make the datasource queries wait for the transaction", async ({
      ds,
    }) => {
      const events: string[] = [];
      const { paused, resume } = createGate();
      const transaction = ds.transactionOrThrow(async (tx) => {
        await insert(tx, 1);
        events.push("inserted");
        await paused;
        events.push("committing");
      });
      await flush();
      const query = getIds(ds).then((ids) => {
        events.push("query");
        return ids;
      });
      await flush();
      expect(events).toStrictEqual(["inserted"]);
      resume();
      await transaction;
      // the query sees the committed row
      await expect(query).resolves.toStrictEqual([1]);
      expect(events).toStrictEqual(["inserted", "committing", "query"]);
    });

    it("should not time the wait for the transaction in the span", async ({
      ds,
    }) => {
      const logger = {
        debug: vi.fn<(message: string, props?: unknown) => void>(),
        info: vi.fn<(message: string, props?: unknown) => void>(),
        warn: vi.fn<(message: string, props?: unknown) => void>(),
        error: vi.fn<(message: string, props?: unknown) => void>(),
      };
      const other = new DuckdbDatasource({
        connection: ds.getConnection(),
        logger: logger as never,
      });
      const { paused, resume } = createGate();
      const transaction = ds.transactionOrThrow(async () => await paused);
      await flush();
      const query = other.query(sql`SELECT 1`, { name: "waiting" });
      await sleep(60);
      resume();
      const [{ meta }] = await Promise.all([query, transaction]);
      expect(meta.getTotalTimeMs()).toBeLessThan(40);
      expect(logger.debug).toHaveBeenCalledWith(
        'Query "{queryName}" waited {lockWaitMs}ms for a transaction',
        expect.objectContaining({
          queryName: "waiting",
          lockWaitMs: expect.any(Number),
        })
      );
      const waitLog = logger.debug.mock.calls.find(([message]) =>
        message.includes("waited")
      );
      expect(waitLog?.[1]).toHaveProperty(
        "lockWaitMs",
        expect.toSatisfy((ms: number) => ms >= 50)
      );
    });

    it("should share the lock between datasources of the same connection", async ({
      ds,
    }) => {
      const other = new DuckdbDatasource({ connection: ds.getConnection() });
      const events: string[] = [];
      const { paused, resume } = createGate();
      const transaction = ds.transactionOrThrow(async (tx) => {
        await insert(tx, 1);
        await paused;
      });
      await flush();
      const query = getIds(other).then((ids) => {
        events.push("query");
        return ids;
      });
      await flush();
      expect(events).toStrictEqual([]);
      resume();
      await transaction;
      await expect(query).resolves.toStrictEqual([1]);
    });

    it("should wait for the running streams before beginning", async ({
      ds,
    }) => {
      await ds.queryOrThrow(
        sql`INSERT INTO product SELECT range::INTEGER FROM range(3)`
      );
      const events: string[] = [];
      const stream = ds.stream(sql<{ id: number }>`SELECT id FROM product`);
      await stream.next();
      const transaction = ds.transactionOrThrow(async () => {
        events.push("transaction");
      });
      await flush();
      expect(events).toStrictEqual([]);
      await stream.return?.(undefined);
      await transaction;
      expect(events).toStrictEqual(["transaction"]);
    });

    it("should run concurrent transactions one after the other", async ({
      ds,
    }) => {
      const results = await Promise.all(
        [1, 2, 3].map((id) =>
          ds.transaction(async (tx) => {
            await insert(tx, id);
            await flush();
            return id;
          })
        )
      );
      expect(results.map((r) => r.error)).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]);
      await expect(getIds(ds)).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should abort a query waiting for the transaction", async ({ ds }) => {
      const { paused, resume } = createGate();
      const transaction = ds.transactionOrThrow(async (tx) => {
        await insert(tx, 1);
        await paused;
      });
      await flush();
      const controller = new AbortController();
      const query = ds.query(sql`SELECT 1`, { signal: controller.signal });
      controller.abort(new Error("timeout"));
      const { error } = await query;
      expect(error?.code).toBe("ABORTED");
      resume();
      // the aborted query didn't interrupt the transaction
      await transaction;
      await expect(getIds(ds)).resolves.toStrictEqual([1]);
    });

    it("should abort a transaction waiting for the lock", async ({ ds }) => {
      const { paused, resume } = createGate();
      const first = ds.transactionOrThrow(async () => await paused);
      await flush();
      const controller = new AbortController();
      const fn = vi.fn<() => Promise<void>>();
      const second = ds.transaction(fn, { signal: controller.signal });
      controller.abort(new Error("timeout"));
      const { error } = await second;
      expect(error?.code).toBe("ABORTED");
      expect(fn).not.toHaveBeenCalled();
      resume();
      await first;
    });
  });

  describe("in the transaction callback", () => {
    it("should run the queries of the datasource in the transaction", async ({
      ds,
    }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        // same connection: runs in the transaction rather than waiting forever
        await ds.queryOrThrow(sql`INSERT INTO product VALUES (2::INTEGER)`);
        const ids: number[] = [];
        for await (const row of ds.stream(
          sql<{ id: number }>`SELECT id FROM product ORDER BY id`
        )) {
          ids.push(row.id);
        }
        tx.rollback(ids.join(","));
      });
      expect(result.error?.message).toBe("Transaction rolled back: 1,2");
      // reported to the transaction
      expect(result.meta.getSpansByType("sql")).toHaveLength(3);
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should not commit after a failed query of the datasource", async ({
      ds,
    }) => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        await ds.query(sql`INSERT INTO product VALUES (1::INTEGER)`);
      });
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should not support nested transactions from the datasource", async ({
      ds,
    }) => {
      const { data } = await ds.transactionOrThrow(async () => {
        const nested = await ds.transaction(async () => 1);
        return nested.error?.message;
      });
      expect(data).toContain("Nested transactions are not supported");
    });

    it("should wait for the lock again after the transaction", async ({
      ds,
    }) => {
      let later: Promise<unknown> | undefined;
      await ds.transactionOrThrow(async (tx) => {
        await insert(tx, 1);
        // started in the callback async context, runs after the end
        later = sleep(20).then(() =>
          ds.queryOrThrow(sql`INSERT INTO product VALUES (2::INTEGER)`)
        );
      });
      const { paused, resume } = createGate();
      const second = ds.transaction(async (tx) => {
        await insert(tx, 3);
        await paused;
        tx.rollback();
      });
      await sleep(40);
      // waiting for the second transaction, not run in it
      resume();
      await second;
      await later;
      await expect(getIds(ds)).resolves.toStrictEqual([1, 2]);
    });
  });

  describe("withConnectionLock", () => {
    it("should make the transactions wait", async ({ ds }) => {
      const conn = ds.getConnection();
      const events: string[] = [];
      const { paused, resume } = createGate();
      const locked = withConnectionLock(conn, async () => {
        await conn.run("INSERT INTO product VALUES (1)");
        await paused;
        events.push("locked");
      });
      await flush();
      const transaction = ds.transactionOrThrow(async () => {
        events.push("transaction");
      });
      await flush();
      expect(events).toStrictEqual([]);
      resume();
      await Promise.all([locked, transaction]);
      expect(events).toStrictEqual(["locked", "transaction"]);
    });

    it("should be reentrant, even with a waiting transaction", async ({
      ds,
    }) => {
      const conn = ds.getConnection();
      const { paused, resume } = createGate();
      const locked = withConnectionLock(conn, async () => {
        await paused;
        // a transaction is waiting: would deadlock without reentrancy
        await ds.queryOrThrow(sql`INSERT INTO product VALUES (1::INTEGER)`);
        await withConnectionLock(conn, () =>
          conn.run("INSERT INTO product VALUES (2)")
        );
      });
      await flush();
      const transaction = ds.transactionOrThrow((tx) => insert(tx, 3));
      await flush();
      resume();
      await Promise.all([locked, transaction]);
      await expect(getIds(ds)).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should fail to begin a transaction in the callback", async ({ ds }) => {
      const result = await withConnectionLock(ds.getConnection(), () =>
        ds.transaction(async () => 1)
      );
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      expect(result.error?.message).toContain(
        "Can't begin a transaction while the connection is held"
      );
    });

    it("should run in a transaction callback, an error preventing the commit", async ({
      ds,
    }) => {
      const conn = ds.getConnection();
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 1);
        await withConnectionLock(conn, () =>
          conn.run("INSERT INTO product VALUES (2)")
        );
        await withConnectionLock(conn, () =>
          conn.run("INSERT INTO product VALUES (2)")
        ).catch(() => undefined);
      });
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      await expect(getIds(ds)).resolves.toStrictEqual([]);
    });

    it("should stop waiting when aborted", async ({ ds }) => {
      const { paused, resume } = createGate();
      const transaction = ds.transactionOrThrow(async () => await paused);
      await flush();
      await expect(
        withConnectionLock(ds.getConnection(), async () => 1, {
          signal: AbortSignal.abort(new Error("timeout")),
        })
      ).rejects.toThrow("timeout");
      resume();
      await transaction;
    });
  });

  describe("conflicts", () => {
    /**
     * Two datasources on two connections of the same database: conflicts
     * only happen between connections (a connection runs one transaction).
     */
    const createDatasources = async () => {
      const instance = await DuckDBInstance.create(":memory:");
      const [conn1, conn2] = await Promise.all([
        instance.connect(),
        instance.connect(),
      ]);
      const ds1 = new DuckdbDatasource({ connection: conn1 });
      const ds2 = new DuckdbDatasource({ connection: conn2 });
      await ds1.queryOrThrow(
        sql`CREATE TABLE stock (id INTEGER PRIMARY KEY, quantity INTEGER)`
      );
      await ds1.queryOrThrow(sql`INSERT INTO stock VALUES (1, 10)`);
      return {
        ds1,
        ds2,
        [Symbol.dispose]: () => {
          conn1.closeSync();
          conn2.closeSync();
          instance.closeSync();
        },
      };
    };

    const decrement = (tx: DuckdbTransactionDatasource) =>
      tx.queryOrThrow(
        sql`UPDATE stock SET quantity = quantity - 1 WHERE id = 1`
      );

    it("should return TRANSACTION_CONFLICT", async () => {
      using dss = await createDatasources();
      const { ds1, ds2 } = dss;
      const { paused, resume } = createGate();
      const first = ds1.transactionOrThrow(async (tx) => {
        await decrement(tx);
        await paused;
      });
      await flush();
      const result = await ds2.transaction(decrement);
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      expect(result.error?.message).toBe(
        "TransactionContext Error: Conflict on update!"
      );
      await expect(ds2.transactionOrThrow(decrement)).rejects.toThrow(
        QErrors.TransactionConflict
      );
      resume();
      await first;
    });

    it("should retry until the concurrent transaction ends", async () => {
      using dss = await createDatasources();
      const { ds1, ds2 } = dss;
      const { paused, resume } = createGate();
      const first = ds1.transactionOrThrow(async (tx) => {
        await decrement(tx);
        await paused;
      });
      await flush();
      setTimeout(resume, 30);
      const result = await ds2.transaction(decrement, {
        retry: { maxRetries: 10, delayMs: 20 },
      });
      await first;
      expect(result.error).toBeUndefined();
      const [span] = result.meta.getSpansByType("transaction");
      expect(span?.retries).toBeGreaterThanOrEqual(1);
      const { data } = await ds1.queryOneOrThrow(
        sql<{ quantity: number }>`SELECT quantity FROM stock WHERE id = 1`
      );
      expect(data.quantity).toBe(8);
    });
  });

  describe("TransactionalDatasourceInterface", () => {
    /**
     * Works with any transactional datasource
     */
    const insertAll = async (
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

    it("should be implemented by the datasource", async ({ ds }) => {
      expectTypeOf(ds).toExtend<TransactionalDatasourceInterface>();
      const { data } = await insertAll(ds, [
        sql`INSERT INTO product VALUES (1::INTEGER)`,
        sql`INSERT INTO product VALUES (2::INTEGER)`,
      ]);
      expect(data).toBe(2);
      await expect(getIds(ds)).resolves.toStrictEqual([1, 2]);
    });
  });

  describe("transactionOrThrow", () => {
    it("should rethrow the callback error as is", async ({ ds }) => {
      const thrown = new QErrors.NoResult();
      await expect(
        ds.transactionOrThrow(async () => {
          throw thrown;
        })
      ).rejects.toBe(thrown);
    });

    it("should throw a TransactionFailed after a failed query", async ({
      ds,
    }) => {
      await expect(
        ds.transactionOrThrow(async (tx) => {
          await tx.query(sql`SELECT err`);
        })
      ).rejects.toThrow(QErrors.TransactionFailed);
    });
  });
});
