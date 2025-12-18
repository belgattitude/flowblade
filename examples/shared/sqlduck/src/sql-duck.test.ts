import type { DuckDBConnection } from '@duckdb/node-api';
import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
import { isParsableStrictIsoDateZ } from '@httpx/assert';
import isInCi from 'is-in-ci';
import { beforeAll, describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsIterator } from '../tests/utils/create-fake-rows-iterator';
import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import { SqlDuck } from './sql-duck';
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
      it('toTable', async () => {
        const dbName = 'memory_db';

        // Arrange
        await conn.run(`ATTACH ':memory:' AS ${dbName} (COMPRESS 'true')`);
        const ds = new DuckdbDatasource({
          connection: conn,
        });

        const sqlDuck = new SqlDuck({ conn });

        /*
        const _databases = await conn.runAndReadAll('SHOW DATABASES');
        const test = await conn.runAndReadAll('SHOW TABLES FROM memory_db');
        expect(test.getRowObjects()).toStrictEqual([]);
        */

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
        const rowGen = createFakeRowsIterator({
          count: limit,
          schema: userSchema,
          factory: ({ faker: faker, rowIdx }) => {
            if (rowIdx === 1) {
              return {
                id: rowIdx,
                name: `name-${rowIdx}`,
                email: `email-${rowIdx}@example.com`,
                bignumber: 10n,
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
        const chunkedCols = rowsToColumnsChunks(rowGen(), 2048);

        const _inserted = await sqlDuck.toTable(
          testTable,
          userSchema,
          chunkedCols
        );

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${testTable.getFullyQualifiedTableName()}`
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
             FROM ${sql.unsafeRaw(dbName + '.' + tableName)} 
             WHERE name = ${params.name} 
             LIMIT 1`
        );
        const { bignumber, email, created_at } = data?.[0] ?? {};
        expect(bignumber).toStrictEqual('10');
        expect(email).toStrictEqual('email-1@example.com');
        expect(isParsableStrictIsoDateZ(created_at)).toBe(true);
        expect(created_at).toBe(now.toISOString());
      });
    },
    testTimeout * 2
  );
});
