import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
import isInCi from 'is-in-ci';
import { describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsIterator } from '../tests/utils/create-fake-rows-iterator';
import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import { SqlDuck } from './sql-duck';
import { zodCodecs } from './utils/zod-codecs';

const testTimeout = 15_000;

describe('Duckdb tests', () => {
  describe(
    'toDuckdb',
    () => {
      it('toTable', async () => {
        const conn = await createDuckdbTestMemoryDb({
          // Keep it high to prevent going to .tmp directory
          max_memory: isInCi ? '128M' : '256M',
          threads: 1,
        });

        await conn.run(`ATTACH ':memory:' AS memory_db (COMPRESS 'true')`);

        const ds = new DuckdbDatasource({
          connection: conn,
        });

        const _databases = await conn.runAndReadAll('SHOW DATABASES');
        const test = await conn.runAndReadAll('SHOW TABLES FROM memory_db');
        expect(test.getRowObjects()).toStrictEqual([]);
        const sqlDuck = new SqlDuck({ conn });

        const userSchema = z.object({
          id: z.number().meta({ description: 'cool' }),
          name: z.string(),
          email: z.email().nullable(),
          bignumber: z.nullable(zodCodecs.bigintToString),
          created_at: zodCodecs.dateToString,
        });

        const limit = isInCi ? 10_000 : 100_000;
        const dbName = 'memory_db';
        const tableName = 'test';

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
          `${dbName}.main.${tableName}`,
          userSchema,
          chunkedCols
        );

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${dbName}.${tableName}`
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
          sql`SELECT bignumber, email, strftime(created_at, '%Y-%m-%dT%H:%M:%S.%fZ') as created_at 
              from ${sql.unsafeRaw(dbName + '.' + tableName)} 
              WHERE name = ${params.name} LIMIT 1`
        );
        expect(data).toStrictEqual([
          {
            bignumber: '10',
            created_at: '2025-12-15T23:00:00.000000Z',
            email: 'email-1@example.com',
          },
        ]);
      });
    },
    testTimeout * 2
  );
});
