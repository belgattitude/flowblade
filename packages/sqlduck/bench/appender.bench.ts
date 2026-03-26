import path from 'node:path';

import isInCi from 'is-in-ci';
import { bench, type BenchOptions, describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';
import { testTempDir } from '@/tests/utils/get-test-temp-dir.ts';

import { DuckDatabaseManager, zodCodecs } from '../src';
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
        id: rowIdx,
        name: `unique-record-for-tests${rowIdx === 0 ? '' : rowIdx}`,
        email: `unique-record-for-tests${rowIdx === 0 ? '' : rowIdx}@example.com`,
        bignumber: bignumberExample,
        created_at: now,
      };
    },
  });

  const conn = await createDuckdbTestMemoryDb({
    // Keep it high to prevent going to .tmp directory
    max_memory: isInCi ? '256M' : '1024M',
    threads: isInCi ? 1 : 4,
  });

  const dbManager = new DuckDatabaseManager(conn);
  const memoryDb = await dbManager.attachIfNotExists({
    type: ':memory:',
    alias: 'memory_db',
    options: {
      COMPRESS: 'true',
    },
  });
  const memoryTable = new Table({
    name: 'test',
    database: memoryDb.alias,
  });

  const fileDb = await dbManager.attachOrReplace({
    type: 'duckdb',
    alias: 'bench_appender',
    path: path.join(testTempDir, 'bench-appender.db'),
    options: {
      ACCESS_MODE: 'READ_WRITE',
      STORAGE_VERSION: 'v1.5.1',
    },
  });
  const fileTable = new Table({
    name: 'test_file',
    database: fileDb.alias,
  });
  const sqlDuck = new SqlDuck({ conn });

  bench(
    `duckdb appender memory, count: ${limit}, chunk size 2048`,
    async () => {
      const { totalRows } = await sqlDuck.toTable({
        table: memoryTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 2048,
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

  bench(
    `duckdb appender file, count: ${limit}, chunk size 2048`,
    async () => {
      const { totalRows } = await sqlDuck.toTable({
        table: fileTable,
        schema: userSchema,
        rowStream: getFakeRowStream(),
        chunkSize: 2048,
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      await dbManager.checkpoint(fileDb.alias);
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
        table: memoryTable,
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
