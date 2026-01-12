import type { DuckDBConnection } from '@duckdb/node-api';
import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
import { isParsableStrictIsoDateZ } from '@httpx/assert';
import isInCi from 'is-in-ci';
import { beforeAll, describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator';
import { SqlDuck } from './sql-duck';
import { getTableCreateFromZod } from './table/get-table-create-from-zod';
import { Table } from './table/table';
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
        const dbName = 'memory_db';
        const bignumberExample = 9_223_372_036_854_775_807n;

        // Arrange
        await conn.run(
          `ATTACH IF NOT EXISTS ':memory:' AS ${dbName} (COMPRESS 'true')`
        );
        const ds = new DuckdbDatasource({
          connection: conn,
        });

        const sqlDuck = new SqlDuck({ conn });

        const userSchema = z.object({
          id: z.number().meta({ description: 'cool' }),
          name: z.string(),
          email: z.email().nullable(),
          bignumber: z.nullable(zodCodecs.bigintToString),
          created_at: zodCodecs.dateToString,
        });

        const limit = isInCi ? 10_000 : 100_000;

        const testTable = new Table({
          name: 'test',
          database: dbName,
        });

        const now = new Date('2025-12-16 00:00:00');
        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema: userSchema,
          factory: ({ faker: faker, rowIdx }) => {
            if (rowIdx === 1) {
              return {
                id: rowIdx,
                name: `name-${rowIdx}`,
                email: `email-${rowIdx}@example.com`,
                bignumber: bignumberExample,
                created_at: now,
              };
            }
            return {
              id: faker.number.int(),
              name: faker.person.fullName(),
              email: faker.internet.email(),
              bignumber: faker.number.bigInt(),
              created_at: faker.date.recent(),
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
          getTableCreateFromZod(testTable, userSchema, {
            create: 'CREATE_OR_REPLACE',
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
          name: 'name-1',
        } as const;

        const { data } = await ds.query(
          sql<{
            bignumber: string;
            email: string;
            created_at: string;
          }>`SELECT 
              bignumber, 
              email, 
              strftime(created_at::TIMESTAMPTZ, '%Y-%m-%dT%H:%M:%S.%gZ') as created_at 
             FROM ${sql.raw(testTable.getFullName())} 
             WHERE name = ${params.name} 
             LIMIT 1`
        );

        const { bignumber, email, created_at } = data?.[0] ?? {};
        expect(bignumber).toStrictEqual(bignumberExample.toString(10));
        expect(email).toStrictEqual('email-1@example.com');
        expect(isParsableStrictIsoDateZ(created_at)).toBe(true);
        expect(created_at).toBe(now.toISOString());
      });
    },
    testTimeout * 2
  );
});
