import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection, DuckDBValue } from "@duckdb/node-api";
import { describe, expect, vi } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";
import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";

import { DuckDatabaseManager } from "../manager/database/duck-database-manager.ts";
import { Table } from "../objects/table.ts";
import { zodCodecs } from "../utils/zod-codecs.ts";
import { DuckTableLoader } from "./duck-table-loader.ts";
import type {
  LoadProgress,
  OnLoadProgressCb,
} from "./progress/progress-collector.ts";
import { ChunkAppenderStrategy } from "./strategies/chunk-appender/chunk-appender-strategy.ts";
import type { LoadProgressOptions, LoadStrategy } from "./types.ts";

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
      "Failed to load data into table 'test_loader_failing' - append failure"
    );
    expect(calls).toStrictEqual(["abort"]);
  });

  describe("checkpoint.onComplete", () => {
    const spyCheckpoints = (
      conn: DuckDBConnection,
      onTestFinished: (fn: () => void) => void
    ) => {
      const spy = vi.spyOn(conn, "run");
      onTestFinished(() => spy.mockRestore());
      return () =>
        spy.mock.calls.filter(([sql]) => sql.startsWith("CHECKPOINT")).length;
    };

    it("should checkpoint by default a database stored in a file", async ({
      conn,
      onTestFinished,
    }) => {
      await mkdir(testTempDir, { recursive: true });
      await new DuckDatabaseManager(conn).attachOrReplace({
        type: "filesystem",
        alias: "loader_file_db",
        path: path.join(testTempDir, "loader-checkpoint.db"),
        options: { accessMode: "READ_WRITE" },
      });
      const countCheckpoints = spyCheckpoints(conn, onTestFinished);
      await new DuckTableLoader({ conn }).load({
        table: new Table({ name: "test_cp", database: "loader_file_db" }),
        schema,
        rows: rows(3),
        mode: "createOrReplace",
      });
      expect(countCheckpoints()).toBe(1);
    });

    it("should not checkpoint by default an in-memory database, whatever its name", async ({
      conn,
      onTestFinished,
    }) => {
      await new DuckDatabaseManager(conn).attachIfNotExists({
        type: "memory",
        alias: "loader_mem_db",
      });
      const countCheckpoints = spyCheckpoints(conn, onTestFinished);
      for (const table of [
        new Table({ name: "test_no_cp", database: "loader_mem_db" }),
        // the current database of the test instance is in memory
        new Table("test_no_cp"),
      ]) {
        await new DuckTableLoader({ conn }).load({
          table,
          schema,
          rows: rows(3),
          mode: "createOrReplace",
        });
      }
      expect(countCheckpoints()).toBe(0);
    });

    it("should checkpoint by default a table without database in a file-backed instance", async ({
      onTestFinished,
    }) => {
      await mkdir(testTempDir, { recursive: true });
      const dbPath = path.join(testTempDir, "loader-checkpoint-main.db");
      await rm(dbPath, { force: true });
      const instance = await DuckDBInstance.create(dbPath);
      const fileConn = await instance.connect();
      onTestFinished(() => {
        fileConn.closeSync();
        instance.closeSync();
      });
      const countCheckpoints = spyCheckpoints(fileConn, onTestFinished);
      await new DuckTableLoader({ conn: fileConn }).load({
        table: new Table("test_cp_main"),
        schema,
        rows: rows(3),
      });
      expect(countCheckpoints()).toBe(1);
    });

    it("should checkpoint an in-memory database when explicitly enabled", async ({
      conn,
      onTestFinished,
    }) => {
      const countCheckpoints = spyCheckpoints(conn, onTestFinished);
      await new DuckTableLoader({ conn }).load({
        table: new Table("test_cp_forced"),
        schema,
        rows: rows(1),
        mode: "createOrReplace",
        checkpoint: { onComplete: true },
      });
      expect(countCheckpoints()).toBe(1);
    });

    it("should find the database case-insensitively", async ({ conn }) => {
      await conn.run("ATTACH IF NOT EXISTS ':memory:' AS LoaderMixedCase");
      const result = await new DuckTableLoader({ conn }).load({
        table: new Table({ name: "t", database: "loadermixedcase" }),
        schema,
        rows: rows(2),
        mode: "createOrReplace",
      });
      expect(result.totalRows).toBe(2);
    });

    it("should reject a database that is not attached", async ({ conn }) => {
      await expect(
        new DuckTableLoader({ conn }).load({
          table: new Table({ name: "t", database: "not_attached" }),
          schema,
          rows: rows(1),
        })
      ).rejects.toThrow(
        "Database 'not_attached' of table 'not_attached.t' is not attached."
      );
    });
  });
});

describe("DuckTableLoader options", () => {
  it("should accept an array of rows", async ({ conn }) => {
    const result = await new DuckTableLoader({ conn }).load({
      table: new Table("test_loader_array"),
      schema,
      rows: [...rows(3)],
      mode: "createOrReplace",
    });
    expect(result.totalRows).toBe(3);
  });

  it("should accept the input type of a codec", async ({ conn }) => {
    const codecSchema = z.object({ big: zodCodecs.bigintToString });
    await new DuckTableLoader({ conn }).load({
      table: new Table("test_loader_codec"),
      schema: codecSchema,
      rows: [{ big: 9_223_372_036_854_775_807n }, { big: "-1" }],
      mode: "createOrReplace",
    });
    const reader = await conn.runAndReadAll(
      "SELECT big::VARCHAR AS big FROM test_loader_codec ORDER BY big"
    );
    expect(reader.getRowObjects()).toStrictEqual([
      { big: "-1" },
      { big: "9223372036854775807" },
    ]);
  });

  describe("progress", () => {
    const loadWithProgress = (
      conn: DuckDBConnection,
      progress: Omit<LoadProgressOptions, "onProgress">,
      count = 10
    ) => {
      const onProgress = vi.fn<OnLoadProgressCb>();
      return new DuckTableLoader({
        conn,
        strategy: new ChunkAppenderStrategy({ chunkSize: 3 }),
      })
        .load({
          table: new Table("test_loader_progress"),
          schema,
          rows: rows(count),
          mode: "createOrReplace",
          progress: { ...progress, onProgress } as LoadProgressOptions,
        })
        .then(() => onProgress.mock.calls.map(([p]) => p.totalRows));
    };

    it("should report every 1000ms by default", async ({ conn }) => {
      // A fast load ends before 1000ms: only the total is reported
      await expect(loadWithProgress(conn, {})).resolves.toStrictEqual([10]);
    });

    it("should report when everyRows is crossed, and the total at the end", async ({
      conn,
    }) => {
      // chunks end at 3, 6, 9, 10: 5 is crossed at 6, 10 at 10
      await expect(
        loadWithProgress(conn, { everyRows: 5 })
      ).resolves.toStrictEqual([6, 10]);
      // 4 is crossed at 6, the total (9) is reported at the end
      await expect(
        loadWithProgress(conn, { everyRows: 4 }, 9)
      ).resolves.toStrictEqual([6, 9]);
    });

    it("should report once intervalMs elapsed, and the total at the end", async ({
      conn,
    }) => {
      await expect(
        loadWithProgress(conn, { intervalMs: 60_000 })
      ).resolves.toStrictEqual([10]);
      await expect(
        loadWithProgress(conn, { intervalMs: 0 })
      ).resolves.toStrictEqual([3, 6, 9, 10]);
    });

    it("should always report a finite rowsPerSecond", async ({ conn }) => {
      const onProgress = vi.fn<OnLoadProgressCb>();
      await new DuckTableLoader({ conn }).load({
        table: new Table("test_loader_rps"),
        schema,
        rows: rows(1),
        mode: "createOrReplace",
        progress: { onProgress },
      });
      const [[progress]] = onProgress.mock.calls as [[LoadProgress]];
      expect(Number.isFinite(progress.rowsPerSecond)).toBe(true);
      expect(progress.totalRows).toBe(1);
    });
  });

  describe("progress timer", () => {
    const countTimers = () =>
      process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;

    async function* slowRows(count: number, delayMs: number) {
      for (let id = 0; id < count; id++) {
        await sleep(delayMs);
        yield { id, name: `name-${id}` };
      }
    }

    it("should report while a chunk is filling with a slow source", async ({
      conn,
    }) => {
      const reported: number[] = [];
      const result = await new DuckTableLoader({ conn }).load({
        table: new Table("test_loader_slow"),
        schema,
        // 30 rows in ~300ms, far below the 2048 rows of a chunk
        rows: slowRows(30, 10),
        mode: "createOrReplace",
        progress: {
          intervalMs: 50,
          onProgress: ({ totalRows }) => {
            reported.push(totalRows);
          },
        },
      });
      expect(result.totalRows).toBe(30);
      // Reported during the load, not only the final total
      expect(reported.length).toBeGreaterThanOrEqual(3);
      expect(reported.at(-1)).toBe(30);
      expect(reported).toStrictEqual(reported.toSorted((a, b) => a - b));
      // Rows reported were loaded: the chunks were yielded early
      const reader = await conn.runAndReadAll(
        "SELECT count(*)::INTEGER AS count FROM test_loader_slow"
      );
      expect(reader.getRowObjects()).toStrictEqual([{ count: 30 }]);
    });

    it("should keep full chunks when onProgress is slower than intervalMs", async ({
      conn,
    }) => {
      const reported: number[] = [];
      async function* rowsWithPauses() {
        for (let id = 0; id < 400; id++) {
          if (id % 10 === 0) {
            await sleep(1);
          }
          yield { id, name: `name-${id}` };
        }
      }
      await new DuckTableLoader({ conn }).load({
        table: new Table("test_loader_slow_progress"),
        schema,
        rows: rowsWithPauses(),
        mode: "createOrReplace",
        progress: {
          intervalMs: 10,
          onProgress: async ({ totalRows }) => {
            reported.push(totalRows);
            // 3x the interval
            await sleep(30);
          },
        },
      });
      // A timer armed before the callback would fire during it, then make
      // each following chunk a single row (~400 calls)
      expect(reported.length).toBeLessThan(40);
      expect(reported.at(-1)).toBe(400);
    });

    it("should not leave a timer after a load", async ({ conn }) => {
      const before = countTimers();
      await new DuckTableLoader({ conn }).load({
        table: new Table("test_loader_timer_ok"),
        schema,
        rows: rows(10),
        mode: "createOrReplace",
        progress: { intervalMs: 60_000, onProgress: () => {} },
      });
      expect(countTimers()).toBe(before);
    });

    it("should not leave a timer after a failing or aborted load", async ({
      conn,
    }) => {
      const before = countTimers();
      await expect(
        new DuckTableLoader({ conn }).load({
          table: new Table("test_loader_timer_ko"),
          schema,
          rows: rows(10),
          mode: "createOrReplace",
          progress: {
            intervalMs: 0,
            onProgress: () => {
              throw new Error("progress failure");
            },
          },
        })
      ).rejects.toThrow("progress failure");
      expect(countTimers()).toBe(before);

      const controller = new AbortController();
      await expect(
        new DuckTableLoader({ conn }).load({
          table: new Table("test_loader_timer_abort"),
          schema,
          rows: (function* abortingRows() {
            yield { id: 1, name: "a" };
            controller.abort();
            yield { id: 2, name: "b" };
          })(),
          mode: "createOrReplace",
          progress: { intervalMs: 60_000, onProgress: () => {} },
          signal: controller.signal,
        })
      ).rejects.toThrow(/abort/i);
      expect(countTimers()).toBe(before);
    });
  });

  it("should not fail a committed load when the final onProgress fails", async ({
    conn,
  }) => {
    const result = await new DuckTableLoader({ conn }).load({
      table: new Table("test_loader_final_progress"),
      schema,
      rows: rows(3),
      mode: "createOrReplace",
      progress: {
        intervalMs: 60_000,
        onProgress: () => {
          throw new Error("progress failure");
        },
      },
    });
    expect(result.totalRows).toBe(3);
    const reader = await conn.runAndReadAll(
      "SELECT count(*)::INTEGER AS count FROM test_loader_final_progress"
    );
    expect(reader.getRowObjects()).toStrictEqual([{ count: 3 }]);
  });

  describe("checkpoint.everyRows", () => {
    it("should checkpoint each time everyRows is crossed", async ({
      conn,
      onTestFinished,
    }) => {
      await new DuckDatabaseManager(conn).attachIfNotExists({
        type: "memory",
        alias: "loader_db_every",
      });
      const spy = vi.spyOn(conn, "run");
      onTestFinished(() => spy.mockRestore());
      await new DuckTableLoader({
        conn,
        strategy: new ChunkAppenderStrategy({ chunkSize: 3 }),
      }).load({
        table: new Table({
          name: "test_cp_every",
          database: "loader_db_every",
        }),
        schema,
        rows: rows(10),
        mode: "createOrReplace",
        // crossed at 6 and 9 (chunks end at 3, 6, 9, 10)
        checkpoint: { everyRows: 4, onComplete: false },
      });
      expect(
        spy.mock.calls.filter(([sql]) => sql.startsWith("CHECKPOINT"))
      ).toHaveLength(2);
    });
  });

  describe("modes", () => {
    it("should append into an existing table", async ({ conn }) => {
      const loader = new DuckTableLoader({ conn });
      const table = new Table("test_loader_append");
      await loader.load({
        table,
        schema,
        rows: rows(2),
        mode: "createOrReplace",
      });
      const result = await loader.load({
        table,
        schema,
        rows: rows(3),
        mode: "append",
      });
      expect(result).toMatchObject({ totalRows: 3, createTableDDL: undefined });
      const reader = await conn.runAndReadAll(
        "SELECT count(*)::INTEGER AS count FROM test_loader_append"
      );
      expect(reader.getRowObjects()).toStrictEqual([{ count: 5 }]);
    });

    it("should reject 'append' when the table does not exist", async ({
      conn,
    }) => {
      await expect(
        new DuckTableLoader({ conn }).load({
          table: new Table("test_loader_missing"),
          schema,
          rows: rows(1),
          mode: "append",
        })
      ).rejects.toThrow(
        "Table 'test_loader_missing' does not exist, use mode 'create' or 'createIfNotExists' to create it."
      );
    });

    describe.each(["append", "createIfNotExists"] as const)("%s", (mode) => {
      it("should reject existing columns that differ from the schema", async ({
        conn,
      }) => {
        await conn.run(
          "CREATE OR REPLACE TABLE test_loader_mismatch (name VARCHAR, id INTEGER)"
        );
        await expect(
          new DuckTableLoader({ conn }).load({
            table: new Table("test_loader_mismatch"),
            schema,
            rows: rows(1),
            mode,
          })
        ).rejects.toThrow(
          "Columns of the existing table 'test_loader_mismatch' (name, id) don't match the schema columns (id, name), names and order must be identical."
        );
      });
    });
  });

  describe("validation", () => {
    it.each([
      [{ checkpoint: { everyRows: 0 } }, "checkpoint.everyRows"],
      [
        { progress: { everyRows: Number.NaN, onProgress: () => {} } },
        "progress.everyRows",
      ],
      [
        { progress: { everyRows: 1.5, onProgress: () => {} } },
        "progress.everyRows",
      ],
    ] as const)("should reject %o", async (options, name) => {
      await expect(
        new DuckTableLoader({ conn: undefined as never }).load({
          table: new Table({ name: "t", database: "db" }),
          schema,
          rows: rows(1),
          ...options,
        })
      ).rejects.toThrow(`${name} must be a positive integer`);
    });

    it("should reject an invalid strategy chunkSize before creating the table", async ({
      conn,
    }) => {
      const strategy: LoadStrategy = {
        name: "invalid",
        chunkSize: 0,
        open: () => Promise.reject(new Error("never opened")),
      };
      await expect(
        new DuckTableLoader({ conn, strategy }).load({
          table: new Table("test_loader_bad_strategy"),
          schema,
          rows: rows(1),
        })
      ).rejects.toThrow("strategy.chunkSize must be a positive integer, got 0");
      const reader = await conn.runAndReadAll(
        "SELECT count(*)::INTEGER AS count FROM duckdb_tables() WHERE table_name = 'test_loader_bad_strategy'"
      );
      expect(reader.getRowObjects()).toStrictEqual([{ count: 0 }]);
    });
  });
});

describe("ChunkAppenderStrategy", () => {
  it.each([0, 2049, 1.5])("should reject chunkSize %s", (chunkSize) => {
    expect(() => new ChunkAppenderStrategy({ chunkSize })).toThrow(
      `chunkSize must be an integer between 1 and 2048, got ${chunkSize}`
    );
  });

  it.each([0, Number.NaN, 1.5])(
    "should reject flushEveryRows %s",
    (flushEveryRows) => {
      expect(() => new ChunkAppenderStrategy({ flushEveryRows })).toThrow(
        `flushEveryRows must be a positive integer, got ${flushEveryRows}`
      );
    }
  );
});
