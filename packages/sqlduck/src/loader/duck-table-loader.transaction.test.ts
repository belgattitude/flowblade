import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { describe, expect } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";
import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";

import { Table } from "../objects/table.ts";
import { DuckTableLoader } from "./duck-table-loader.ts";

const it = createDuckTest({ threads: 1 });

const schema = z.object({ id: z.int32() });

async function* slowRows(count: number, delayMs: number) {
  for (let id = 0; id < count; id++) {
    await sleep(delayMs);
    yield { id };
  }
}

const countRows = async (conn: DuckDBConnection, table: string) => {
  const reader = await conn.runAndReadAll(
    `SELECT count(*)::INTEGER AS count FROM ${table}`
  );
  return reader.getRowObjectsJS()[0]?.count;
};

describe("DuckTableLoader with DuckdbDatasource transactions", () => {
  it("should make a transaction on the same connection wait for the load", async ({
    conn,
  }) => {
    const ds = new DuckdbDatasource({ connection: conn });
    const events: string[] = [];
    const load = new DuckTableLoader({ conn })
      .load({
        table: new Table("tx_wait_loaded"),
        schema,
        rows: slowRows(3, 10),
      })
      .then(() => events.push("load"));
    await sleep(5);
    const transaction = ds
      .transactionOrThrow(async (tx) => {
        // sees the complete table
        const { data } = await tx.queryOneOrThrow(
          sql<{
            count: number;
          }>`SELECT count(*)::INTEGER AS count FROM tx_wait_loaded`
        );
        return data.count;
      })
      .then(({ data }) => {
        events.push("transaction");
        return data;
      });
    const [, count] = await Promise.all([load, transaction]);
    expect(events).toStrictEqual(["load", "transaction"]);
    expect(count).toBe(3);
  });

  it("should load in the transaction from its callback", async ({ conn }) => {
    const ds = new DuckdbDatasource({ connection: conn });
    await conn.run("CREATE TABLE tx_cb_kept (id INTEGER)");
    const result = await ds.transaction(async (tx) => {
      await tx.queryOrThrow(sql`INSERT INTO tx_cb_kept VALUES (1)`);
      const { totalRows } = await new DuckTableLoader({ conn }).load({
        table: new Table("tx_cb_loaded"),
        schema,
        rows: [{ id: 1 }, { id: 2 }],
      });
      tx.rollback(`loaded ${totalRows}`);
    });
    expect(result.error?.message).toBe("Transaction rolled back: loaded 2");
    // both rolled back
    await expect(countRows(conn, "tx_cb_kept")).resolves.toBe(0);
    const { data: tables } = await ds.queryOrThrow(
      sql<{
        name: string;
      }>`SELECT table_name as name FROM duckdb_tables() WHERE table_name = 'tx_cb_loaded'`
    );
    expect(tables).toStrictEqual([]);
  });

  it("should not commit when a load failed in the callback", async ({
    conn,
  }) => {
    const ds = new DuckdbDatasource({ connection: conn });
    await conn.run("CREATE TABLE tx_fail_kept (id INTEGER)");
    const result = await ds.transaction(async (tx) => {
      await tx.queryOrThrow(sql`INSERT INTO tx_fail_kept VALUES (1)`);
      await new DuckTableLoader({ conn })
        .load({
          table: new Table("tx_fail_kept"),
          schema,
          rows: [{ id: 1 }],
          // fails: the table exists
          mode: "create",
        })
        .catch(() => undefined);
    });
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
    await expect(countRows(conn, "tx_fail_kept")).resolves.toBe(0);
  });

  it("should skip the checkpoints of a load in the callback (file database)", async ({
    onTestFinished,
  }) => {
    await mkdir(testTempDir, { recursive: true });
    const dbPath = path.join(testTempDir, "loader-transaction.db");
    await rm(dbPath, { force: true });
    const instance = await DuckDBInstance.create(dbPath);
    const fileConn = await instance.connect();
    onTestFinished(() => {
      fileConn.closeSync();
      instance.closeSync();
    });
    const ds = new DuckdbDatasource({ connection: fileConn });
    const result = await ds.transaction(async () => {
      const { totalRows } = await new DuckTableLoader({
        conn: fileConn,
      }).load({
        table: new Table("tx_file_loaded"),
        schema,
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
        // both ignored: DuckDB can't checkpoint in a transaction
        checkpoint: { everyRows: 1, onComplete: true },
      });
      return totalRows;
    });
    expect(result.error).toBeUndefined();
    expect(result.data).toBe(3);
    await expect(countRows(fileConn, "tx_file_loaded")).resolves.toBe(3);
  });
});
