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
import { createMssqlDatasource } from "./create-mssql-datasource.ts";
import type { mssqlE2eDb } from "./get-mssql-e2e-migrations.ts";

// ids out of the seeded data range, deleted after each test
const firstId = 100_000;

describe("MSSQL e2e transactions", () => {
  let ds: KyselyDatasource<mssqlE2eDb>;

  beforeAll(() => {
    ds = createMssqlDatasource<mssqlE2eDb>(inject("mssql"));
    return async () => {
      await ds.getConnection().destroy();
    };
  });

  afterEach(async () => {
    await ds.queryOrThrow(
      ds.queryBuilder.deleteFrom("TestTableLinked").where("id", ">=", firstId)
    );
  });

  const insertLinked = (
    tx: KyselyTransactionDatasource<mssqlE2eDb>,
    id: number
  ) =>
    tx.queryOrThrow(
      tx.queryBuilder
        .insertInto("TestTableLinked")
        .values({ id, name: `linked-${id}`, test_table_id: 1 })
    );

  const getLinkedIds = async () => {
    const { data } = await ds.queryOrThrow(
      ds.queryBuilder
        .selectFrom("TestTableLinked")
        .select("id")
        .where("id", ">=", firstId)
        .orderBy("id")
    );
    return data.map((row) => row.id);
  };

  it("should commit the queries", async () => {
    const result = await ds.transaction(
      async (tx) => {
        await insertLinked(tx, firstId);
        await insertLinked(tx, firstId + 1);
        // reads its own writes
        const { data } = await tx.queryOneOrThrow(
          tx.queryBuilder
            .selectFrom("TestTableLinked")
            .select((eb) => eb.fn.countAll<number>().as("count"))
            .where("id", ">=", firstId)
        );
        return data.count;
      },
      { name: "insertLinked", isolationLevel: "serializable" }
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toBe(2);
    await expect(getLinkedIds()).resolves.toStrictEqual([firstId, firstId + 1]);
    expect(result.meta.getSpans().map((span) => span.type)).toStrictEqual([
      "transaction",
      "sql",
      "sql",
      "sql",
    ]);
    expect(result.meta.getSpans()[0]).toMatchObject({
      status: "committed",
      isolationLevel: "serializable",
    });
  });

  it("should roll back when a query fails", async () => {
    const result = await ds.transaction(async (tx) => {
      await insertLinked(tx, firstId);
      // primary key violation
      await insertLinked(tx, firstId);
    });
    expect(result.error?.code).toBe("ROLLED_BACK");
    expect(result.error?.cause).toBeInstanceOf(QErrors.QueryFailed);
    // 2627: violation of primary key constraint
    expect(result.error?.cause).toHaveProperty(
      "cause",
      expect.objectContaining({ number: 2627 })
    );
    await expect(getLinkedIds()).resolves.toStrictEqual([]);
  });

  it("should not commit after a failed query handled by the callback", async () => {
    const result = await ds.transaction(async (tx) => {
      await insertLinked(tx, firstId);
      // primary key violation, doesn't abort a sql server transaction
      const { error } = await tx.query(
        tx.queryBuilder
          .insertInto("TestTableLinked")
          .values({ id: firstId, name: "duplicate", test_table_id: 1 })
      );
      return error?.code;
    });
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
    expect(result.error?.cause).toHaveProperty("number", 2627);
    await expect(getLinkedIds()).resolves.toStrictEqual([]);
  });

  it("should roll back with tx.rollback()", async () => {
    await expect(
      ds.transactionOrThrow(async (tx) => {
        await insertLinked(tx, firstId);
        tx.rollback("changed my mind");
      })
    ).rejects.toThrow(new QErrors.RolledBack("changed my mind"));
    await expect(getLinkedIds()).resolves.toStrictEqual([]);
  });

  it("should stream in the transaction", async () => {
    const { data: names } = await ds.transactionOrThrow(async (tx) => {
      await insertLinked(tx, firstId);
      const rows: string[] = [];
      for await (const row of tx.stream(
        tx.queryBuilder
          .selectFrom("TestTableLinked")
          .select("name")
          .where("id", ">=", firstId)
      )) {
        rows.push(row.name);
      }
      return rows;
    });
    expect(names).toStrictEqual([`linked-${firstId}`]);
  });

  it("should apply the isolation level", async () => {
    // sys.dm_exec_sessions: 1 = read uncommitted, 2 = read committed, 4 = serializable
    const getLevel = (tx: KyselyTransactionDatasource<mssqlE2eDb>) =>
      tx.queryOneOrThrow(
        sql<{ level: number }>`SELECT transaction_isolation_level as level
          FROM sys.dm_exec_sessions WHERE session_id = @@SPID`
      );
    const levels = await Promise.all(
      (["read uncommitted", "serializable"] as const).map(
        async (isolationLevel) => {
          const { data } = await ds.transactionOrThrow(
            async (tx) => {
              const { data: row } = await getLevel(tx);
              return row.level;
            },
            { isolationLevel }
          );
          return data;
        }
      )
    );
    expect(levels).toStrictEqual([1, 4]);
  });

  describe("conflicts", () => {
    beforeAll(async () => {
      // already on for the master database
      await ds.queryOrThrow(sql`
        DECLARE @alter NVARCHAR(MAX) = 'ALTER DATABASE ' + QUOTENAME(DB_NAME()) + ' SET ALLOW_SNAPSHOT_ISOLATION ON';
        IF (SELECT snapshot_isolation_state FROM sys.databases WHERE name = DB_NAME()) = 0
          EXEC(@alter);
      `);
    });

    /**
     * A snapshot transaction updating a row changed (and committed) by
     * another transaction since its first read: SQL Server error 3960.
     */
    const updateAfterConcurrentChange =
      (
        tx: KyselyTransactionDatasource<mssqlE2eDb>,
        changeConcurrently: boolean
      ) =>
      async () => {
        // the snapshot starts with the first read
        await tx.queryOrThrow(
          tx.queryBuilder
            .selectFrom("TestTableLinked")
            .select("name")
            .where("id", "=", firstId)
        );
        if (changeConcurrently) {
          await ds.queryOrThrow(
            ds.queryBuilder
              .updateTable("TestTableLinked")
              .set({ name: "concurrent" })
              .where("id", "=", firstId)
          );
        }
        await tx.queryOrThrow(
          tx.queryBuilder
            .updateTable("TestTableLinked")
            .set({ name: "transaction" })
            .where("id", "=", firstId)
        );
      };

    const getName = async () => {
      const { data } = await ds.queryOneOrThrow(
        ds.queryBuilder
          .selectFrom("TestTableLinked")
          .select("name")
          .where("id", "=", firstId)
      );
      return data.name;
    };

    beforeEach(async () => {
      await ds.queryOrThrow(
        ds.queryBuilder
          .insertInto("TestTableLinked")
          .values({ id: firstId, name: "initial", test_table_id: 1 })
      );
    });

    it("should return TRANSACTION_CONFLICT", async () => {
      const result = await ds.transaction(
        (tx) => updateAfterConcurrentChange(tx, true)(),
        { isolationLevel: "snapshot" }
      );
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      expect(result.error?.cause).toBeInstanceOf(QErrors.QueryFailed);
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
          return updateAfterConcurrentChange(tx, attempts === 1)();
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
