import isInCi from 'is-in-ci';
import { bench, type BenchOptions, describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';

import { zodCodecs } from '../src';
import { Table } from '../src/objects/table.ts';
import { SqlDuck } from '../src/sql-duck.ts';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator.ts';

const benchConfig: BenchOptions = {
  iterations: isInCi ? 1 : 1,
  warmupIterations: isInCi ? 1 : 1,
  throws: true,
};

describe('appender benches', async () => {
  const userSchema = z.object({
    id: z.int32().meta({ description: 'cool' }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(zodCodecs.bigintToString),
    created_at: zodCodecs.dateToString,
  });

  const limit = isInCi ? 10_000 : 100_000;

  const now = new Date('2025-12-16 00:00:00');
  const bignumberExample = 9_223_372_036_854_775_807n;
  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: userSchema,
    factory: ({ rowIdx }) => {
      return {
        id: z.parse(z.int32(), rowIdx),
        name: `unique-record-for-tests`,
        email: `unique-record-for-tests@example.com`,
        bignumber: bignumberExample,
        created_at: now,
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
  await conn.run(
    `ATTACH IF NOT EXISTS ':memory:' AS ${dbName} (COMPRESS 'true')`
  );
  const testTable = new Table({
    name: 'test',
    database: dbName,
  });

  const sqlDuck = new SqlDuck({ conn });

  bench(
    `duckdb appender, count: ${limit}, chunk size 2048`,
    async () => {
      const { totalRows } = await sqlDuck.toTable({
        table: testTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 2048,
        /*
      onDataAppended: (stats) => {
        const heap = v8.getHeapStatistics();
        console.log({
          ...stats,
          mem: Math.round(heap.used_heap_size / 1024 / 1024),
        });
      }, */
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    },
    benchConfig
  );

  bench.skipIf(isInCi)(
    `duckdb appender, count: ${limit}, chunk size 1024`,
    async () => {
      const { totalRows: totalRows } = await sqlDuck.toTable({
        table: testTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 1024,
        /*
      onDataAppended: (stats) => {
        const heap = v8.getHeapStatistics();
        console.log({
          ...stats,
          mem: Math.round(heap.used_heap_size / 1024 / 1024),
        });
      }, */
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      if (totalRows !== limit) {
        throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
      }
    },
    benchConfig
  );
});
