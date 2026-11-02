import path from "node:path";

import isInCi from "is-in-ci";
import { type BenchCompareOptions, test } from "vitest";
import * as z from "zod";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";

import { DuckDatabaseManager, zodCodecs } from "../src/index.ts";
import { DuckTableLoader } from "../src/loader/duck-table-loader.ts";
import { ChunkAppenderStrategy } from "../src/loader/strategies/chunk-appender/chunk-appender-strategy.ts";
import { Table } from "../src/objects/table.ts";
import { createFakeRowsAsyncIterator } from "../tests/utils/create-fake-rows-iterator.ts";

const benchConfig: BenchCompareOptions = {
  iterations: 1,
  warmupIterations: 1,
  throws: true,
};

test("appender benches", async ({ bench, onTestFinished }) => {
  const userSchema = z.object({
    id: z.int32().meta({ description: "cool" }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(zodCodecs.bigintToString),
    created_at: zodCodecs.dateToString,
  });

  const limit = isInCi ? 10_000 : 100_000;

  const now = new Date("2025-12-16 00:00:00");
  const bignumberExample = 9_223_372_036_854_775_807n;
  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: userSchema,
    factory: ({ rowIdx }) => {
      const repeatedIdx = String((rowIdx % 20) + 1);
      return {
        id: rowIdx,
        name: `unique-record-for-tests${rowIdx === 0 ? "" : repeatedIdx}`,
        email: `unique-record-for-tests${rowIdx === 0 ? "" : repeatedIdx}@example.com`,
        bignumber: bignumberExample,
        created_at: now,
      };
    },
  });

  const duckDb = await openDuckdbTestMemoryDb({
    // Keep it high to prevent going to .tmp directory
    max_memory: isInCi ? "256M" : "2048M",
    threads: isInCi ? 1 : 4,
  });
  onTestFinished(() => duckDb.close());
  const { conn } = duckDb;

  const dbManager = new DuckDatabaseManager(conn);
  const memoryDb = await dbManager.attachIfNotExists({
    type: "memory",
    alias: "memory_db",
    options: {
      accessMode: "READ_WRITE",
      compress: true,
    },
  });
  const memoryTable = new Table({
    name: "test",
    database: memoryDb.alias,
  });

  const dbFilePath = path.join(testTempDir, "bench-appender.db");
  const dbFilePathNoWAL = path.join(testTempDir, "bench-appender-no-wal.db");

  const fileDb = await dbManager.attachOrReplace({
    type: "filesystem",
    alias: "bench_appender",
    path: dbFilePath,
    options: {
      accessMode: "READ_WRITE",
      blockSize: 262_144,
    },
  });
  const fileTable = new Table({
    name: "test_file",
    database: fileDb.alias,
  });

  const fileDbNoWAL = await dbManager.attachOrReplace({
    type: "filesystem",
    alias: "bench_appender_no_wal",
    path: dbFilePathNoWAL,
    options: {
      accessMode: "READ_WRITE",
      blockSize: 262_144,
      recoveryMode: "no_wal_writes",
    },
  });
  const fileTableNoWAL = new Table({
    name: "test_file",
    database: fileDbNoWAL.alias,
  });

  // Same settings as the former toTable defaults: flush and checkpoint every
  // 100 chunks, checkpoint once loaded
  const loaders = {
    2048: new DuckTableLoader({
      conn,
      strategy: new ChunkAppenderStrategy({
        chunkSize: 2048,
        flushEveryRows: 100 * 2048,
      }),
    }),
    1024: new DuckTableLoader({
      conn,
      strategy: new ChunkAppenderStrategy({
        chunkSize: 1024,
        flushEveryRows: 100 * 1024,
      }),
    }),
  } as const;

  await bench.compare(
    bench(`duckdb appender memory, count: ${limit}, chunk size 2048`, async () => {
      const { totalRows } = await loaders[2048].load({
        table: memoryTable,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        checkpoint: { everyRows: 100 * 2048, onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    }),
    bench(`duckdb appender file, count: ${limit}, chunk size 2048`, async () => {
      const { totalRows } = await loaders[2048].load({
        table: fileTable,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        checkpoint: { everyRows: 100 * 2048, onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    }),
    bench(`duckdb appender file no wal, count: ${limit}, chunk size 2048`, async () => {
      const { totalRows } = await loaders[2048].load({
        table: fileTableNoWAL,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        checkpoint: { everyRows: 100 * 2048, onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    }),
    bench(`duckdb appender file no wal, count: ${limit}, chunk size 1024`, async () => {
      const { totalRows } = await loaders[1024].load({
        table: fileTableNoWAL,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        checkpoint: { everyRows: 100 * 1024, onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    }),
    bench(
      `duckdb appender, count: ${limit}, chunk size 1024`,
      benchConfig,
      async () => {
        const { totalRows } = await loaders[1024].load({
          table: memoryTable,
          schema: userSchema,
          rows: getFakeRowStream(),
          mode: "createOrReplace",
          checkpoint: { onComplete: true },
          /*
          progress: {
            everyRows: 1024,
            onProgress: (stats) => {
              const heap = v8.getHeapStatistics();
              console.log({
                ...stats,
                mem: Math.round(heap.used_heap_size / 1024 / 1024),
              });
            },
          }, */
        });
        if (totalRows !== limit) {
          throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
        }
      }
    ),
    benchConfig
  );
});
