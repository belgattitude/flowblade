import type { DuckDBConnection } from '@duckdb/node-api';
import { type LogRecord, reset } from '@logtape/logtape';
import isInCi from 'is-in-ci';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import * as z from 'zod';

import { configureTestLogger } from '@/tests/utils/configure-test-logger.ts';
import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';

import { flowbladeLogtapeSqlduckConfig } from '../config/flowblade-logtape-sqlduck.config.ts';
import { Table } from '../objects/table.ts';
import { createTableFromZod } from './create-table-from-zod.ts';

describe('createTableFromZod', () => {
  let conn: DuckDBConnection;
  beforeAll(async () => {
    conn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? '128M' : '256M',
      threads: 1,
    });
  });
  afterAll(() => {
    conn.closeSync();
  });
  describe('Logger', () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configureTestLogger(logBuffer);
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it('should log success', async () => {
      const { ddl } = await createTableFromZod({
        conn,
        table: new Table('test'),
        schema: z.object({
          id: z.string(),
        }),
        options: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      expect(logBuffer[0]!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: ["Generate DDL for table 'test'"],
        level: 'debug',
        properties: {
          ddl: ddl,
        },
      });
      expect(logBuffer[1]!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: ["Table 'test' successfully created"],
        level: 'info',
        properties: {
          ddl: ddl,
        },
      });
    });

    it('should log error', async () => {
      const _res = await conn.run('CREATE OR REPLACE TABLE test(id STRING)');
      const errMessage =
        'Failed to create table \'test\': Catalog Error: Table with name "test" already exists!';
      await expect(
        createTableFromZod({
          conn,
          table: new Table('test'),
          schema: z.object({
            id: z.string().meta({}),
          }),
          options: {
            create: 'CREATE',
          },
        })
      ).rejects.toThrow(errMessage);

      expect(logBuffer[1]!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: [errMessage],
        level: 'error',
        properties: {
          ddl: expect.stringContaining('CREATE TABLE'),
        },
      });
    });
  });
});
