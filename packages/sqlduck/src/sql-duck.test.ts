import type { DuckDBConnection } from '@duckdb/node-api';
import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
import { isParsableStrictIsoDateZ } from '@httpx/assert';
import { type LogRecord, reset } from '@logtape/logtape';
import isInCi from 'is-in-ci';
import { beforeAll, describe } from 'vitest';
import * as z from 'zod';

import { configureTestLogger } from '@/tests/utils/configure-test-logger.ts';
import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db';
import { createFakeRowsAsyncIterator } from '@/tests/utils/create-fake-rows-iterator';

import { flowbladeLogtapeSqlduckConfig } from './config/flowblade-logtape-sqlduck.config';
import { DuckDatabaseManager } from './manager/database/duck-database-manager.ts';
import { Table } from './objects/table';
import { SqlDuck } from './sql-duck';
import { getTableCreateFromZod } from './table/get-table-create-from-zod';
import { zodCodecs } from './utils/zod-codecs.ts';

const testTimeout = 15_000;

describe('Duckdb tests', async () => {
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

  describe(
    'toTable',
    () => {
      it('Should append data into duckdb memory table', async () => {
        const bignumberExample = 9_223_372_036_854_775_807n;

        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: 'memory',
          alias: 'sql_duck_test',
        });

        const ds = new DuckdbDatasource({
          connection: conn,
        });

        const sqlDuck = new SqlDuck({ conn });

        const userSchema = z.strictObject({
          id: z.int32().meta({ description: 'cool' }),
          name: z.string(),
          email: z.email().nullable(),
          bignumber: z.nullable(zodCodecs.bigintToString),
          created_at: zodCodecs.dateToString,
          gender: z.nullable(z.enum(['M', 'F'])),
          // uuid_v7: z.nullable(z.uuidv7()),
        });

        const limit = isInCi ? 10_000 : 100_000;

        const testTable = new Table({
          name: 'test',
          database: database.alias,
        });

        const now = new Date('2025-12-16 00:00:00');
        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema: userSchema,
          factory: ({ faker: faker, rowIdx }) => {
            if (rowIdx === 0) {
              return {
                id: z.int32().parse(rowIdx),
                name: `unique-record-for-tests`,
                email: `unique-record-for-tests@example.com`,
                bignumber: bignumberExample,
                created_at: now,
                gender: 'F',
                // uuid_v7: '019d2155-d292-71fa-87d7-9d1f1ed83569',
              } as const;
            }
            return {
              id: faker.number.int(),
              name: faker.person.fullName(),
              email: faker.internet.email(),
              bignumber: faker.number.bigInt(),
              created_at: faker.date.recent(),
              gender: 'M',
              // uuid_v7: faker.string.uuid({ version: 7 }),
            } as const;
          },
        });

        const cb = vi.fn();

        const { timeMs, totalRows, createTableDDL } = await sqlDuck.toTable({
          table: testTable,
          schema: userSchema,
          rowStream: getFakeRowStream(),
          chunkSize: 2048,
          onChunkAppended: cb,
          createOptions: {
            create: 'CREATE_OR_REPLACE',
          },
          checkpointChunksFrequency: 4,
          autoCheckpoint: true,
        });

        expect(cb).toHaveBeenCalledTimes(Math.ceil(limit / 2048));

        expect(cb).toHaveBeenNthCalledWith(1, {
          totalRows: 2048,
          timeMs: expect.any(Number),
          rowsPerSecond: expect.any(Number),
        });

        expect(cb).toHaveBeenLastCalledWith({
          totalRows: totalRows,
          timeMs: expect.any(Number),
          rowsPerSecond: expect.any(Number),
        });

        expect(totalRows).toBe(limit);
        expect(timeMs).toBeGreaterThan(100);
        expect(createTableDDL).toStrictEqual(
          getTableCreateFromZod({
            table: testTable,
            schema: userSchema,
            options: {
              create: 'CREATE_OR_REPLACE',
            },
          }).ddl
        );

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${testTable.getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            count_star: BigInt(limit),
          },
        ]);

        const params = {
          name: 'unique-record-for-tests',
        } as const;

        const { data } = await ds.query(
          sql<{
            name: string;
            bignumber: string;
            email: string;
            created_at: string;
            gender: string;
            // uuid_v7: string;
          }>`SELECT 
              name,
              bignumber, 
              email, 
              strftime(created_at::TIMESTAMPTZ, '%Y-%m-%dT%H:%M:%S.%gZ') as created_at,
              gender
             FROM ${sql.raw(testTable.getFullName())} 
             WHERE name = ${params.name} 
             LIMIT 1`
        );
        const { name, bignumber, email, created_at, gender } = data?.[0] ?? {};
        expect(name).toStrictEqual('unique-record-for-tests');
        expect(email).toStrictEqual('unique-record-for-tests@example.com');
        expect(bignumber).toStrictEqual(bignumberExample.toString(10));
        expect(isParsableStrictIsoDateZ(created_at)).toBe(true);
        expect(created_at).toBe(now.toISOString());
        expect(gender).toStrictEqual('F');
      });

      it('Should respect onChunkAppendedFrequency', async () => {
        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: 'memory',
          alias: 'sql_duck_test_frequency',
        });

        const sqlDuck = new SqlDuck({ conn });

        const schema = z.object({
          id: z.number(),
        });

        // 10 chunks of 10 rows = 100 rows
        const limit = 100;
        const chunkSize = 10;
        const frequency = 3;

        const testTable = new Table({
          name: 'test_frequency',
          database: database.alias,
        });

        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema: schema,
          factory: ({ rowIdx }) => ({ id: rowIdx }),
        });

        const cb = vi.fn();

        // Act
        await sqlDuck.toTable({
          table: testTable,
          schema: schema,
          rowStream: getFakeRowStream(),
          chunkSize: chunkSize,
          onChunkAppended: cb,
          onChunkAppendedFrequency: frequency,
          createOptions: {
            create: 'CREATE_OR_REPLACE',
          },
        });

        // Assert
        // Total chunks = 10
        // Frequency = 3
        // Callback should be called at chunks: 3, 6, 9
        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ totalRows: 30 })
        );
        expect(cb).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ totalRows: 60 })
        );
        expect(cb).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ totalRows: 90 })
        );
      });

      it('Should respect flushSyncFrequency', async () => {
        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: 'memory',
          alias: 'sql_duck_test_flush',
        });

        const sqlDuck = new SqlDuck({ conn });

        const schema = z.object({
          id: z.number(),
        });

        // 10 chunks of 10 rows = 100 rows
        const limit = 100;
        const chunkSize = 10;
        const flushFrequency = 4;

        const testTable = new Table({
          name: 'test_flush',
          database: database.alias,
        });

        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema: schema,
          factory: ({ rowIdx }) => ({ id: rowIdx }),
        });

        // Since we can't easily spy on the appender created internally,
        // we'll at least verify it doesn't crash and the data is inserted.
        // If there were a way to provide a custom appender or spy on createAppender, we would.

        // Act
        const result = await sqlDuck.toTable({
          table: testTable,
          schema: schema,
          rowStream: getFakeRowStream(),
          chunkSize: chunkSize,
          flushSyncFrequency: flushFrequency,
          createOptions: {
            create: 'CREATE_OR_REPLACE',
          },
        });

        // Assert
        expect(result.totalRows).toBe(limit);

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${testTable.getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            count_star: BigInt(limit),
          },
        ]);
      });
    },
    testTimeout * 2
  );

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
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attachIfNotExists({
        type: 'memory',
        alias: 'sql_duck_test',
      });
      const sqlDuck = new SqlDuck({ conn });
      const rowStream = async function* gen() {
        yield { id: 'test' };
        yield await Promise.resolve({ id: 'test2' });
      };
      await sqlDuck.toTable({
        table: new Table({
          name: 'test',
          database: database.alias,
        }),
        schema: z.object({
          id: z.string(),
        }),
        rowStream: rowStream(),
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      expect(logBuffer.at(-1)!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: [
          expect.stringMatching(
            /Successfully appended 2 rows into 'sql_duck_test.test' in \d+ms/
          ),
        ],
        level: 'info',
        properties: {
          timeMs: expect.any(Number),
          totalRows: 2,
        },
      });
    });

    it('should log error', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attachIfNotExists({
        type: 'memory',
        alias: 'sql_duck_test',
      });
      const sqlDuck = new SqlDuck({ conn });
      const rowStream = function* gen() {
        yield { id: 'not a number' as unknown as number };
      };

      // on nodejs: Cannot convert 1 to a BigInt
      // on bun: Invalid argument type in ToBigInt ope…
      const regexpError =
        /failed to append data into table (.*)test(.*)bigint/i;

      await expect(
        sqlDuck.toTable({
          table: new Table({
            name: 'test',
            database: database.alias,
          }),
          schema: z.strictObject({
            id: z.number(),
          }),
          rowStream: rowStream(),
          createOptions: {
            create: 'CREATE_OR_REPLACE',
          },
        })
      ).rejects.toThrow(regexpError);

      expect(logBuffer.at(-1)!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: [expect.stringMatching(regexpError)],
        level: 'error',
      });
    });
  });
});
