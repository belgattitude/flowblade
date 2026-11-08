import { setTimeout as sleep } from "node:timers/promises";

import { sql } from "kysely";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
} from "vitest";

import {
  type KyselyDatasource,
  type KyselyTransactionDatasource,
  QErrors,
} from "../../../src";
import {
  createPostgresDatasource,
  type PostgresE2eDb,
} from "./create-postgres-datasource.ts";

type Tx = KyselyTransactionDatasource<PostgresE2eDb>;

describe("Postgres e2e transactions", () => {
  let ds: KyselyDatasource<PostgresE2eDb>;

  beforeAll(() => {
    ds = createPostgresDatasource(inject("postgres"));
    return async () => {
      await ds.getConnection().destroy();
    };
  });

  beforeEach(async () => {
    await ds.queryOrThrow(
      ds.queryBuilder.insertInto("stock").values([
        { id: 1, name: "apple", quantity: 10 },
        { id: 2, name: "pear", quantity: 10 },
      ])
    );
  });

  afterEach(async () => {
    await ds.queryOrThrow(ds.queryBuilder.deleteFrom("stock"));
  });

  const insert = (tx: Tx, id: number) =>
    tx.queryOrThrow(
      tx.queryBuilder
        .insertInto("stock")
        .values({ id, name: `product-${id}`, quantity: 1 })
    );

  const decrement = (tx: Tx | KyselyDatasource<PostgresE2eDb>, id: number) =>
    tx.queryOrThrow(
      tx.queryBuilder
        .updateTable("stock")
        .set((eb) => {
          return { quantity: eb("quantity", "-", 1) };
        })
        .where("id", "=", id)
    );

  const getIds = async () => {
    const { data } = await ds.queryOrThrow(
      ds.queryBuilder.selectFrom("stock").select("id").orderBy("id")
    );
    return data.map((row) => row.id);
  };

  const getQuantity = async (id: number) => {
    const { data } = await ds.queryOneOrThrow(
      ds.queryBuilder
        .selectFrom("stock")
        .select("quantity")
        .where("id", "=", id)
    );
    return data.quantity;
  };

  it("should commit the queries", async () => {
    const result = await ds.transaction(
      async (tx) => {
        await insert(tx, 3);
        await insert(tx, 4);
        const { data } = await tx.queryOrThrow(
          tx.queryBuilder.selectFrom("stock").select("id").orderBy("id")
        );
        return data.map((row) => row.id);
      },
      { name: "insertStock" }
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toStrictEqual([1, 2, 3, 4]);
    await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 4]);
    expect(result.meta.getSpans().map((span) => span.type)).toStrictEqual([
      "transaction",
      "sql",
      "sql",
      "sql",
    ]);
  });

  it("should report domain rollback as a typed QResult error", async () => {
    const domainError = new QErrors.DomainRollback("OUT_OF_STOCK", {
      productId: 3,
    });
    const result = await ds.transaction(async (tx) => {
      await insert(tx, 3);
      throw domainError;
    });

    expect(result.error?.code).toBe("DOMAIN_ROLLBACK");
    expect(result.error?.reason).toBe("OUT_OF_STOCK");
    expect(result.error?.details).toStrictEqual({ productId: 3 });
    expect(result.error?.cause).toBe(domainError);
    expect(result.meta.getSpans()[0]).toMatchObject({
      type: "transaction",
      status: "rolled back",
    });
    await expect(getIds()).resolves.toStrictEqual([1, 2]);
  });

  it("should roll back when a query throws", async () => {
    const result = await ds.transaction(async (tx) => {
      await insert(tx, 3);
      // unique violation
      await insert(tx, 1);
    });
    expect(result.error?.code).toBe("ROLLED_BACK");
    expect(result.error?.cause).toHaveProperty(
      "cause",
      expect.objectContaining({ code: "23505" })
    );
    await expect(getIds()).resolves.toStrictEqual([1, 2]);
  });

  it("should not commit after a failed query handled by the callback", async () => {
    let nextQueryCode: unknown;
    const result = await ds.transaction(async (tx) => {
      await insert(tx, 3);
      // never throws: handled by the callback
      await tx.query(
        tx.queryBuilder
          .insertInto("stock")
          .values({ id: 1, name: "duplicate", quantity: 1 })
      );
      // postgres aborted the transaction: any query fails, and a COMMIT
      // would silently roll back
      const { error } = await tx.query(sql`SELECT 1`);
      nextQueryCode = (error?.cause as { code?: unknown } | undefined)?.code;
    });
    // 25P02: in failed sql transaction
    expect(nextQueryCode).toBe("25P02");
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
    expect(result.error?.message).toContain(
      "A query failed in the transaction, it can't be committed"
    );
    await expect(getIds()).resolves.toStrictEqual([1, 2]);
  });

  describe("savepoint", () => {
    it("should roll back the savepoint only, the transaction goes on", async () => {
      const result = await ds.transaction(async (tx) => {
        await insert(tx, 3);
        // duplicate key: without a savepoint, postgres aborts the transaction
        const duplicate = await tx.savepoint((sp) => insert(sp, 1), {
          name: "duplicate",
        });
        await insert(tx, 4);
        return duplicate.error;
      });
      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({ code: "ROLLED_BACK" });
      expect(result.data?.cause).toHaveProperty(
        "cause",
        expect.objectContaining({ code: "23505" })
      );
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 4]);
      expect(
        result.meta.getSpansByType("savepoint").map((span) => span.status)
      ).toStrictEqual(["rolled back"]);
    });

    it("should release the savepoints, nested included", async () => {
      await ds.transactionOrThrow(async (tx) => {
        await tx.savepointOrThrow(async (outer) => {
          await insert(outer, 3);
          await outer.savepoint(async (inner) => {
            await insert(inner, 4);
            inner.rollback("inner only");
          });
          await insert(outer, 5);
        });
      });
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 5]);
    });

    it("should roll back the released savepoints with the transaction", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.savepointOrThrow((sp) => insert(sp, 3));
        tx.rollback();
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      await expect(getIds()).resolves.toStrictEqual([1, 2]);
    });
  });

  it("should apply the isolation level and access mode", async () => {
    const { data } = await ds.transactionOrThrow(
      async (tx) => {
        const { data: rows } = await tx.queryOrThrow(
          sql<{
            isolation: string;
            readOnly: string;
          }>`SELECT current_setting('transaction_isolation') as isolation,
                    current_setting('transaction_read_only') as "readOnly"`
        );
        return rows[0];
      },
      { isolationLevel: "serializable", accessMode: "read only" }
    );
    expect(data).toStrictEqual({ isolation: "serializable", readOnly: "on" });

    // 25006: read only sql transaction
    const result = await ds.transaction((tx) => insert(tx, 3), {
      accessMode: "read only",
    });
    expect(result.error?.code).toBe("ROLLED_BACK");
    expect(result.error?.cause).toHaveProperty(
      "cause",
      expect.objectContaining({ code: "25006" })
    );
  });

  describe("conflicts", () => {
    /**
     * A repeatable read transaction updating a row changed (and committed)
     * by another transaction since its first read: 40001.
     */
    const decrementAfterConcurrentChange = async (
      tx: Tx,
      changeConcurrently: boolean
    ) => {
      // the snapshot starts with the first query
      await tx.queryOrThrow(sql`SELECT 1`);
      if (changeConcurrently) {
        await decrement(ds, 1);
      }
      await decrement(tx, 1);
    };

    it("should return TRANSACTION_CONFLICT on serialization failure", async () => {
      const result = await ds.transaction(
        (tx) => decrementAfterConcurrentChange(tx, true),
        { isolationLevel: "repeatable read" }
      );
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      expect(result.error?.message).toBe(
        "could not serialize access due to concurrent update"
      );
      await expect(
        ds.transactionOrThrow(
          (tx) => decrementAfterConcurrentChange(tx, true),
          { isolationLevel: "repeatable read" }
        )
      ).rejects.toThrow(QErrors.TransactionConflict);
      await expect(getQuantity(1)).resolves.toBe(8);
    });

    it("should retry the serialization failures", async () => {
      let attempts = 0;
      const result = await ds.transaction(
        (tx) => {
          attempts++;
          return decrementAfterConcurrentChange(tx, attempts === 1);
        },
        { isolationLevel: "repeatable read", retry: { maxRetries: 2 } }
      );
      expect(result.error).toBeUndefined();
      expect(attempts).toBe(2);
      expect(result.meta.getSpans()[0]).toMatchObject({ retries: 1 });
      // the concurrent change and the retried transaction
      await expect(getQuantity(1)).resolves.toBe(8);
    });

    it("should retry the deadlock victim", async () => {
      // two transactions locking the rows in opposite orders
      const lockBoth = async (tx: Tx, first: number, second: number) => {
        // detect the deadlock quickly (default: 1s)
        await tx.queryOrThrow(sql`SET LOCAL deadlock_timeout = '100ms'`);
        await decrement(tx, first);
        await sleep(100);
        await decrement(tx, second);
      };
      const options = { retry: { maxRetries: 2, delayMs: 10 } };
      const [a, b] = await Promise.all([
        ds.transaction((tx) => lockBoth(tx, 1, 2), options),
        ds.transaction((tx) => lockBoth(tx, 2, 1), options),
      ]);
      expect(a.error).toBeUndefined();
      expect(b.error).toBeUndefined();
      // the victim retried: 40P01 deadlock detected
      const retries = [a, b].map(
        (result) => result.meta.getSpansByType("transaction")[0]?.retries ?? 0
      );
      expect(retries.toSorted((x, y) => x - y)).toStrictEqual([0, 1]);
      await expect(getQuantity(1)).resolves.toBe(8);
      await expect(getQuantity(2)).resolves.toBe(8);
    });
  });

  it("should abort a running transaction and roll it back", async () => {
    const result = await ds.transaction(
      async (tx) => {
        await insert(tx, 3);
        await tx.queryOrThrow(sql`SELECT pg_sleep(5)`, {
          inflightQueryAbortStrategy: "cancel query",
        });
      },
      { signal: AbortSignal.timeout(200) }
    );
    expect(result.error?.code).toBe("ABORTED");
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "rolled back" });
    await expect(getIds()).resolves.toStrictEqual([1, 2]);
  });
});
