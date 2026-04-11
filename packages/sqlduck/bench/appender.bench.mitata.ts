import * as os from 'node:os';
import v8 from 'node:v8';

import isInCi from 'is-in-ci';
import { bench, boxplot, run, summary } from 'mitata';
import * as z from 'zod';

import { DuckMemory } from '../src/helpers/duck-memory.ts';
import { Table } from '../src/objects/table.ts';
import { SqlDuck } from '../src/sql-duck.ts';
import { zodCodecs } from '../src/utils/zod-codecs.ts';
import { createDuckdbTestMemoryDb } from '../tests/utils/create-duckdb-test-memory-db.ts';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator.ts';

const userSchema = z.object({
  id: z.int32().meta({ description: 'cool' }),
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
      email: email,
      bignumber: BigInt(rowIdx),
    };
  },
});

const conn = await createDuckdbTestMemoryDb({
  // Keep it high to prevent going to .tmp directory
  max_memory: isInCi ? '256M' : '512M',
  threads: 1,
});

const dbName = 'memory_db';
// Arrange
await conn.run(`ATTACH IF NOT EXISTS ':memory:' AS ${dbName} (COMPRESS)`);
const testTable = new Table({
  name: 'test',
  database: dbName,
});

const sqlDuck = new SqlDuck({ conn });
const duckMemory = new DuckMemory(conn);

boxplot(() => {
  summary(() => {
    bench('duckdb appender, chunk size 2048', async () => {
      const { totalRows } = await sqlDuck.toTable({
        table: testTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 2048,
        onChunkAppendedFrequency: 10,
        onChunkAppended: async (stats) => {
          const heap = v8.getHeapStatistics();
          const duckMem = await duckMemory.getSummary();
          console.log({
            ...stats,
            usedHeapSizeMb: Math.round(heap.used_heap_size / 1024 / 1024),
            freeMemMb: os.freemem() / 1024 / 1024,
            duckMem,
          });
        },
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
        checkpointChunksFrequency: 100,
        autoCheckpoint: true,
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows}`);
      }
    }).gc('inner');

    bench('duckdb appender, chunk size 1024', async () => {
      const { totalRows } = await sqlDuck.toTable({
        table: testTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 1024,
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows}`);
      }
    }).gc('inner');
  });
});

await run({ throw: true });
