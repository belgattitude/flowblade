import * as os from "node:os";
import v8 from "node:v8";

import isInCi from "is-in-ci";
import { bench, boxplot, run, summary } from "mitata";
import * as z from "zod";

import { DuckMemory } from "../src/helpers/duck-memory.ts";
import { DuckTableLoader } from "../src/loader/duck-table-loader.ts";
import { ChunkAppenderStrategy } from "../src/loader/strategies/chunk-appender/chunk-appender-strategy.ts";
import { Table } from "../src/objects/table.ts";
import { zodCodecs } from "../src/utils/zod-codecs.ts";
import { createDuckdbTestMemoryDb } from "../tests/utils/create-duckdb-test-memory-db.ts";
import { createFakeRowsAsyncIterator } from "../tests/utils/create-fake-rows-iterator.ts";

const userSchema = z.object({
  id: z.int32().meta({ description: "cool" }),
  name: z.string(),
  email: z.email().nullable(),
  bignumber: z.nullable(zodCodecs.bigintToString),
});

const limit = isInCi ? 10_000 : 1_000_000;

const email = `email@example.com`.repeat(150);
const getFakeRowStream = createFakeRowsAsyncIterator({
  count: limit,
  schema: userSchema,
  factory: ({ rowIdx }) => {
    return {
      id: rowIdx,
      name: `name-${rowIdx}`,
      email,
      bignumber: BigInt(rowIdx),
    };
  },
});

const conn = await createDuckdbTestMemoryDb({
  // Keep it high to prevent going to .tmp directory
  max_memory: isInCi ? "256M" : "512M",
  threads: 1,
});

const dbName = "memory_db";
// Arrange
await conn.run(`ATTACH IF NOT EXISTS ':memory:' AS ${dbName} (COMPRESS)`);
const testTable = new Table({
  name: "test",
  database: dbName,
});

// Same settings as the former toTable defaults: flush every 100 chunks
const loader2048 = new DuckTableLoader({
  conn,
  strategy: new ChunkAppenderStrategy({
    chunkSize: 2048,
    flushEveryRows: 100 * 2048,
  }),
});
const loader1024 = new DuckTableLoader({
  conn,
  strategy: new ChunkAppenderStrategy({
    chunkSize: 1024,
    flushEveryRows: 100 * 1024,
  }),
});
const duckMemory = new DuckMemory(conn);

boxplot(() => {
  summary(() => {
    bench("duckdb appender, chunk size 2048", async () => {
      const { totalRows } = await loader2048.load({
        table: testTable,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        progress: {
          everyRows: 10 * 2048,
          onProgress: async (stats) => {
            const heap = v8.getHeapStatistics();
            const duckMem = await duckMemory.getSummary();
            console.log({
              ...stats,
              usedHeapSizeMb: Math.round(heap.used_heap_size / 1024 / 1024),
              freeMemMb: os.freemem() / 1024 / 1024,
              duckMem,
            });
          },
        },
        checkpoint: { everyRows: 100 * 2048, onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows}`);
      }
    }).gc("inner");

    bench("duckdb appender, chunk size 1024", async () => {
      const { totalRows } = await loader1024.load({
        table: testTable,
        schema: userSchema,
        rows: getFakeRowStream(),
        mode: "createOrReplace",
        checkpoint: { onComplete: true },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows}`);
      }
    }).gc("inner");
  });
});

await run({ throw: true });
