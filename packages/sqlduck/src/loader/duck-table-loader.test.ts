import type { DuckDBConnection, DuckDBValue } from "@duckdb/node-api";
import { describe, expect, vi } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";

import { DuckDatabaseManager } from "../manager/database/duck-database-manager.ts";
import { Table } from "../objects/table.ts";
import { DuckTableLoader } from "./duck-table-loader.ts";
import { ChunkAppenderStrategy } from "./strategies/chunk-appender/chunk-appender-strategy.ts";
import type { LoadStrategy } from "./types.ts";

const it = createDuckTest({ threads: 1 });

const schema = z.object({ id: z.int32(), name: z.string() });

function* rows(count: number) {
  for (let id = 0; id < count; id++) {
    yield { id, name: `name-${id}` };
  }
}

describe("DuckTableLoader", () => {
  it("should load rows with the default chunk appender strategy", async ({
    conn,
  }) => {
    const result = await new DuckTableLoader({ conn }).load({
      table: new Table("test_loader_default"),
      schema,
      rows: rows(5),
      mode: "createOrReplace",
    });
    expect(result).toMatchObject({
      totalRows: 5,
      strategy: "chunkAppender",
      mode: "createOrReplace",
    });
    expect(result.createTableDDL).toContain("CREATE OR REPLACE TABLE");
    const reader = await conn.runAndReadAll(
      "SELECT count(*)::INTEGER AS count FROM test_loader_default"
    );
    expect(reader.getRowObjects()).toStrictEqual([{ count: 5 }]);
  });

  it("should hand converted chunks to a custom strategy", async ({ conn }) => {
    const received: DuckDBValue[][][] = [];
    const calls: string[] = [];
    const strategy: LoadStrategy = {
      name: "recorder",
      chunkSize: 2,
      open: async ({ columnTypes }) => {
        calls.push(`open:${columnTypes.length}`);
        return {
          appendChunk: (columns) => {
            received.push(columns);
          },
          complete: async () => {
            calls.push("complete");
          },
          abort: () => {
            calls.push("abort");
          },
        };
      },
    };
    const result = await new DuckTableLoader({ conn, strategy }).load({
      table: new Table("test_loader_custom"),
      schema,
      rows: rows(5),
      mode: "createOrReplace",
    });
    expect(result).toMatchObject({ totalRows: 5, strategy: "recorder" });
    expect(calls).toStrictEqual(["open:2", "complete"]);
    expect(received.map((columns) => columns[0])).toStrictEqual([
      [0, 1],
      [2, 3],
      [4],
    ]);
  });

  it("should abort the strategy session when appending fails", async ({
    conn,
  }) => {
    const calls: string[] = [];
    const strategy: LoadStrategy = {
      name: "failing",
      chunkSize: 2,
      open: async () => {
        return {
          appendChunk: async () => {
            throw new Error("append failure");
          },
          complete: () => {
            calls.push("complete");
          },
          abort: () => {
            calls.push("abort");
            throw new Error("abort failure");
          },
        };
      },
    };
    await expect(
      new DuckTableLoader({ conn, strategy }).load({
        table: new Table("test_loader_failing"),
        schema,
        rows: rows(5),
        mode: "createOrReplace",
      })
    ).rejects.toThrow(
      "Failed to append data into table 'test_loader_failing' - append failure"
    );
    expect(calls).toStrictEqual(["abort"]);
  });

  describe("checkpoint.onComplete", () => {
    const spyCheckpoints = (
      conn: DuckDBConnection,
      onTestFinished: (fn: () => void) => void
    ) => {
      const spy = vi.spyOn(conn, "runAndReadAll");
      onTestFinished(() => spy.mockRestore());
      return () =>
        spy.mock.calls.filter(([sql]) => sql.startsWith("CHECKPOINT")).length;
    };

    it("should checkpoint by default when the table has a database", async ({
      conn,
      onTestFinished,
    }) => {
      await new DuckDatabaseManager(conn).attachIfNotExists({
        type: "memory",
        alias: "loader_db",
      });
      const countCheckpoints = spyCheckpoints(conn, onTestFinished);
      await new DuckTableLoader({ conn }).load({
        table: new Table({ name: "test_loader_cp", database: "loader_db" }),
        schema,
        rows: rows(3),
        mode: "createOrReplace",
      });
      expect(countCheckpoints()).toBe(1);
    });

    it("should not checkpoint by default when the table has no database", async ({
      conn,
      onTestFinished,
    }) => {
      const countCheckpoints = spyCheckpoints(conn, onTestFinished);
      const result = await new DuckTableLoader({ conn }).load({
        table: new Table("test_loader_no_cp"),
        schema,
        rows: rows(3),
        mode: "createOrReplace",
      });
      expect(result.totalRows).toBe(3);
      expect(countCheckpoints()).toBe(0);
    });

    it("should require a database name when explicitly enabled", async ({
      conn,
    }) => {
      await expect(
        new DuckTableLoader({ conn }).load({
          table: new Table("test_loader_checkpoint"),
          schema,
          rows: rows(1),
          checkpoint: { onComplete: true },
        })
      ).rejects.toThrow(
        "checkpoint.onComplete requires table.databaseName to be provided."
      );
    });
  });
});

describe("ChunkAppenderStrategy", () => {
  it.each([0, 2049, 1.5])("should reject chunkSize %s", (chunkSize) => {
    expect(() => new ChunkAppenderStrategy({ chunkSize })).toThrow(
      "chunkSize must be a number between 1 and 2048"
    );
  });

  it("should reject an out of range flushEvery", () => {
    expect(() => new ChunkAppenderStrategy({ flushEvery: 0 })).toThrow(
      "flushEvery must be a number between 1 and 100_000."
    );
  });
});
