import { setTimeout as sleep } from "node:timers/promises";

import type { DuckDBConnection } from "@duckdb/node-api";
import { describe, expect, vi } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";
import {
  loadStrategies,
  strategyTableName,
} from "#tests/utils/load-strategies.ts";

import { Table } from "../../../src/index.ts";
import { DuckTableLoader } from "../../../src/loader/index.ts";

const it = createDuckTest({ threads: 1 });

const countRows = async (conn: DuckDBConnection, table: Table) => {
  const reader = await conn.runAndReadAll(
    `SELECT count(*)::INTEGER AS count FROM ${table.getFullName()}`
  );
  return reader.getRowObjects()[0]?.count;
};

const schema = z.object({ id: z.number() });

function* rows(count: number) {
  for (let id = 0; id < count; id++) {
    yield { id };
  }
}

describe.each(loadStrategies)("robustness with %s", (name, createStrategy) => {
  const loaderOf = (conn: DuckDBConnection, chunkSize: number) =>
    new DuckTableLoader({ conn, strategy: createStrategy(chunkSize) });
  const tableOf = (base: string) => new Table(strategyTableName(base, name));

  it("should not leak values between chunks", async ({ conn }) => {
    // chunkSize 2: the same positions alternate between null and values,
    // lists change length, the last chunk is smaller
    const data = [
      { id: 1, name: "a", tags: ["x", "y"] },
      { id: 2, name: null, tags: null },
      { id: 3, name: null, tags: [] },
      { id: 4, name: "d", tags: ["z"] },
      { id: 5, name: "e", tags: null },
    ];
    const table = tableOf("chunk_reuse");
    await loaderOf(conn, 2).load({
      table,
      schema: z.object({
        id: z.int32(),
        name: z.string().nullable(),
        tags: z.array(z.string()).nullable(),
      }),
      rows: data,
      mode: "createOrReplace",
    });
    const reader = await conn.runAndReadAll(
      `SELECT id, name, tags FROM ${table.getFullName()} ORDER BY id`
    );
    expect(reader.getRowObjectsJson()).toStrictEqual(data);
  });

  describe("progress", () => {
    it("should await an onProgress callback returning a promise", async ({
      conn,
    }) => {
      let settled = 0;
      // A regular function (not async) returning a promise
      const onProgress = () =>
        sleep(5).then(() => {
          settled++;
          return undefined;
        });
      await loaderOf(conn, 10).load({
        table: tableOf("progress_promise"),
        schema,
        rows: rows(30),
        mode: "createOrReplace",
        progress: { intervalMs: 0, onProgress },
      });
      // 3 chunks of 10 rows, reported after each one
      expect(settled).toBe(3);
    });

    it("should reject when an onProgress promise rejects", async ({ conn }) => {
      await expect(
        loaderOf(conn, 10).load({
          table: tableOf("progress_reject"),
          schema,
          rows: rows(30),
          mode: "createOrReplace",
          progress: {
            intervalMs: 0,
            onProgress: () => Promise.reject(new Error("callback failure")),
          },
        })
      ).rejects.toThrow("callback failure");
    });
  });

  describe("signal", () => {
    it("should reject with the abort reason and keep appended chunks", async ({
      conn,
    }) => {
      const table = tableOf("abort");
      const controller = new AbortController();
      let closed = false;
      async function* abortingRows() {
        try {
          for (let id = 0; id < 100; id++) {
            if (id === 25) {
              controller.abort();
            }
            yield { id };
          }
        } finally {
          closed = true;
        }
      }

      const error = await loaderOf(conn, 10)
        .load({
          table,
          schema,
          rows: abortingRows(),
          mode: "createOrReplace",
          signal: controller.signal,
        })
        .catch((error: unknown) => error);
      expect(error).toBe(controller.signal.reason);
      expect(error).toMatchObject({ name: "AbortError" });
      expect(closed).toBe(true);

      // The 2 full chunks appended before the abort are kept
      await expect(countRows(conn, table)).resolves.toBe(20);
    });

    it("should reject before creating the table when already aborted", async ({
      conn,
    }) => {
      const table = tableOf("abort_before_start");
      const reason = new Error("cancelled");
      await expect(
        loaderOf(conn, 10).load({
          table,
          schema,
          rows: rows(1),
          mode: "createOrReplace",
          signal: AbortSignal.abort(reason),
        })
      ).rejects.toBe(reason);
      const reader = await conn.runAndReadAll(
        `SELECT count(*)::INTEGER AS count FROM duckdb_tables() WHERE table_name = '${table.tableName}'`
      );
      expect(reader.getRowObjects()).toStrictEqual([{ count: 0 }]);
    });
  });
});

// The prepared insert strategy doesn't use an appender
describe.each(
  loadStrategies.filter(([name]) => name !== "PreparedInsertStrategy")
)("appender failures with %s", (name, createStrategy) => {
  it("should not hide the original error when the appender can't be closed", async ({
    conn,
    onTestFinished,
  }) => {
    const createAppender = conn.createAppender.bind(conn);
    const spy = vi
      .spyOn(conn, "createAppender")
      .mockImplementationOnce(async (...args) => {
        const appender = await createAppender(...args);
        const closeSync = appender.closeSync.bind(appender);
        // Release the native appender, which may be left in the middle of a row
        onTestFinished(() => {
          try {
            closeSync();
          } catch {
            // Nothing left to flush
          }
        });
        // The chunk strategy appends data chunks, the row strategy ends rows
        appender.appendDataChunk = () => {
          throw new Error("append failure");
        };
        appender.endRow = () => {
          throw new Error("append failure");
        };
        appender.closeSync = () => {
          throw new Error("close failure");
        };
        return appender;
      });
    onTestFinished(() => spy.mockRestore());

    await expect(
      new DuckTableLoader({ conn, strategy: createStrategy(10) }).load({
        table: new Table(strategyTableName("close_failure", name)),
        schema,
        rows: rows(30),
        mode: "createOrReplace",
      })
    ).rejects.toThrow("append failure");
  });
});
