import { setTimeout as sleep } from "node:timers/promises";

import { QErrors } from "@flowblade/core";
import { describe, expect, inject, it } from "vitest";

import type {
  KnexDatasource,
  KnexTransactionDatasource,
} from "../../../src/index.ts";
import { defineSharedE2e, type Stock } from "../shared/define-shared-e2e.ts";
import { createPostgresDatasource } from "./create-postgres-datasource.ts";

const info = inject("postgres");
const ds = createPostgresDatasource(info);

describe("Postgres e2e", () => {
  defineSharedE2e({
    ds,
    singleConnectionDs: createPostgresDatasource(info, { poolMax: 1 }),
    rawWriteAffectedRows: 2,
    sleepSql: (seconds) => `select pg_sleep(${seconds})`,
  });

  type Db = KnexDatasource | KnexTransactionDatasource;
  const decrement = async (db: Db, id: number) =>
    await db.queryOrThrow(
      db.queryBuilder<Stock>("stock").where({ id }).decrement("quantity", 1)
    );
  const getQuantity = async (id: number) => {
    const { data } = await ds.queryOneOrThrow(
      ds.queryBuilder<Stock>("stock").select("quantity").where({ id })
    );
    return data.quantity;
  };

  it("should apply the isolation level and access mode", async () => {
    const { data } = await ds.transactionOrThrow(
      async (tx) => {
        const { data: rows } = await tx.queryOrThrow<
          ReturnType<typeof tx.queryBuilder.raw>,
          { isolation: string; readOnly: string }[]
        >(
          tx.queryBuilder.raw(
            `select current_setting('transaction_isolation') as isolation,
                    current_setting('transaction_read_only') as "readOnly"`
          )
        );
        return rows[0];
      },
      { isolationLevel: "serializable", accessMode: "read only" }
    );
    expect(data).toStrictEqual({ isolation: "serializable", readOnly: "on" });

    // 25006: read only sql transaction
    const result = await ds.transaction(
      async (tx) =>
        await tx.queryOrThrow(
          tx
            .queryBuilder<Stock>("stock")
            .insert({ id: 9, name: "x", quantity: 1 })
        ),
      { accessMode: "read only" }
    );
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
      tx: KnexTransactionDatasource,
      changeConcurrently: boolean
    ) => {
      // the snapshot starts with the first query
      await tx.queryOrThrow(tx.queryBuilder.raw("select 1"));
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
      // Knex prefixes the sql to the driver message
      expect(result.error?.message).toContain(
        "could not serialize access due to concurrent update"
      );
      await expect(
        ds.transactionOrThrow(
          (tx) => decrementAfterConcurrentChange(tx, true),
          {
            isolationLevel: "repeatable read",
          }
        )
      ).rejects.toThrow(QErrors.TransactionConflict);
    });

    it("should retry the serialization failures", async () => {
      await ds.queryOrThrow(
        ds
          .queryBuilder<Stock>("stock")
          .update({ quantity: 10 })
          .where({ id: 1 })
      );
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
      const lockBoth = async (
        tx: KnexTransactionDatasource,
        first: number,
        second: number
      ) => {
        // detect the deadlock quickly (default: 1s)
        await tx.queryOrThrow(
          tx.queryBuilder.raw("set local deadlock_timeout = '100ms'")
        );
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
      const retries = [a, b].map(
        (result) => result.meta.getSpansByType("transaction")[0]?.retries ?? 0
      );
      expect(retries.toSorted((x, y) => x - y)).toStrictEqual([0, 1]);
    });
  });
});
