import { describe, expect, inject, it } from "vitest";

import type { KnexTransactionDatasource } from "../../../src/index.ts";
import { defineSharedE2e, type Stock } from "../shared/define-shared-e2e.ts";
import { createMssqlDatasource } from "./create-mssql-datasource.ts";

const info = inject("mssql");
const ds = createMssqlDatasource(info);

describe("MSSQL e2e", () => {
  defineSharedE2e({
    ds,
    singleConnectionDs: createMssqlDatasource(info, { poolMax: 1 }),
    rawWriteAffectedRows: 0,
    sleepSql: (seconds) =>
      `WAITFOR DELAY '00:00:${String(seconds).padStart(2, "0")}'`,
  });

  it("should apply the isolation level", async () => {
    // sys.dm_exec_sessions: 1 = read uncommitted, 4 = serializable
    const getLevel = async (
      isolationLevel: "read uncommitted" | "serializable"
    ) => {
      const { data } = await ds.transactionOrThrow(
        async (tx) => {
          const { data: row } = await tx.queryOneOrThrow<
            ReturnType<typeof tx.queryBuilder.raw>,
            { level: number }[]
          >(
            tx.queryBuilder.raw(
              "select transaction_isolation_level as level from sys.dm_exec_sessions where session_id = @@SPID"
            )
          );
          return row.level;
        },
        { isolationLevel }
      );
      return data;
    };
    await expect(getLevel("read uncommitted")).resolves.toBe(1);
    await expect(getLevel("serializable")).resolves.toBe(4);
  });

  describe("conflicts", () => {
    /**
     * A snapshot transaction updating a row changed (and committed) by
     * another transaction since its first read: SQL Server error 3960.
     */
    const updateAfterConcurrentChange = async (
      tx: KnexTransactionDatasource,
      changeConcurrently: boolean
    ) => {
      // the snapshot starts with the first read
      await tx.queryOrThrow(
        tx.queryBuilder<Stock>("stock").select("name").where({ id: 1 })
      );
      if (changeConcurrently) {
        await ds.queryOrThrow(
          ds
            .queryBuilder<Stock>("stock")
            .update({ name: "concurrent" })
            .where({ id: 1 })
        );
      }
      await tx.queryOrThrow(
        tx
          .queryBuilder<Stock>("stock")
          .update({ name: "transaction" })
          .where({ id: 1 })
      );
    };

    const getName = async () => {
      const { data } = await ds.queryOneOrThrow(
        ds.queryBuilder<Stock>("stock").select("name").where({ id: 1 })
      );
      return data.name;
    };

    it("should return TRANSACTION_CONFLICT", async () => {
      await ds.queryOrThrow(
        ds.queryBuilder.raw(`
          DECLARE @alter NVARCHAR(MAX) = 'ALTER DATABASE ' + QUOTENAME(DB_NAME()) + ' SET ALLOW_SNAPSHOT_ISOLATION ON';
          IF (SELECT snapshot_isolation_state FROM sys.databases WHERE name = DB_NAME()) = 0
            EXEC(@alter);
        `)
      );
      const result = await ds.transaction(
        (tx) => updateAfterConcurrentChange(tx, true),
        { isolationLevel: "snapshot" }
      );
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      // 3960: snapshot isolation update conflict
      expect(result.error?.cause).toHaveProperty(
        "cause",
        expect.objectContaining({ number: 3960 })
      );
      await expect(getName()).resolves.toBe("concurrent");
    });

    it("should retry the conflicting transaction", async () => {
      let attempts = 0;
      const result = await ds.transaction(
        (tx) => {
          attempts++;
          return updateAfterConcurrentChange(tx, attempts === 1);
        },
        { isolationLevel: "snapshot", retry: { maxRetries: 2, delayMs: 0 } }
      );
      expect(result.error).toBeUndefined();
      expect(attempts).toBe(2);
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "committed",
        retries: 1,
      });
      await expect(getName()).resolves.toBe("transaction");
    });
  });
});
