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
import { zodCodecs } from './utils/zod-codecs';

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
                // uuid_v7: '019d2155-d292-71fa-87d7-9d1f1ed83569',
              };
            }
            return {
              id: faker.number.int(),
              name: faker.person.fullName(),
              email: faker.internet.email(),
              bignumber: faker.number.bigInt(),
              created_at: faker.date.recent(),
              // uuid_v7: faker.string.uuid({ version: 7 }),
            };
          },
        });

        const cb = vi.fn();

        const { timeMs, totalRows, createTableDDL } = await sqlDuck.toTable({
          table: testTable,
          schema: userSchema,
          rowStream: getFakeRowStream(),
          chunkSize: 2048,
          onDataAppended: cb,
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
            // uuid_v7: string;
          }>`SELECT 
              name,
              bignumber, 
              email, 
              strftime(created_at::TIMESTAMPTZ, '%Y-%m-%dT%H:%M:%S.%gZ') as created_at
             FROM ${sql.raw(testTable.getFullName())} 
             WHERE name = ${params.name} 
             LIMIT 1`
        );
        const { name, bignumber, email, created_at } = data?.[0] ?? {};
        expect(name).toStrictEqual('unique-record-for-tests');
        expect(email).toStrictEqual('unique-record-for-tests@example.com');
        expect(bignumber).toStrictEqual(bignumberExample.toString(10));
        expect(isParsableStrictIsoDateZ(created_at)).toBe(true);
        expect(created_at).toBe(now.toISOString());
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
        yield { id: 1 };
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
