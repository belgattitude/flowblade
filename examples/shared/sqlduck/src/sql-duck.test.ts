import isInCi from 'is-in-ci';
import { describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsIterator } from '../tests/utils/create-fake-rows-iterator';
import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import { SqlDuck } from './sql-duck';

const testTimeout = 10_000;

describe('Duckdb tests', () => {
  describe(
    'toDuckdb',
    () => {
      it('should', async () => {
        const conn = await createDuckdbTestMemoryDb({
          // Keep it high to prevent going to .tmp directory
          max_memory: isInCi ? '128M' : '256M',
          threads: 1,
        });
        await conn.run(`ATTACH ':memory:' AS memory_db (COMPRESS 'true')`);
        const _databases = await conn.runAndReadAll('SHOW DATABASES');
        const test = await conn.runAndReadAll('SHOW TABLES FROM memory_db');
        expect(test.getRowObjects()).toStrictEqual([]);
        const sqlDuck = new SqlDuck({ conn });

        const userSchema = z.object({
          id: z.number(),
          name: z.string(),
          email: z.email(),
          created_at: z.date(),
        });
        const limit = isInCi ? 10_000 : 1_000_000;

        const now = new Date();
        const rowGen = createFakeRowsIterator({
          count: limit,
          schema: userSchema,
          factory: ({ faker, rowIdx }) => {
            return {
              id: rowIdx,
              name: `name-${rowIdx}`,
              email: `email-${rowIdx}@example.com`,
              created_at: now,
            };

            return {
              id: faker.number.int(),
              name: faker.person.fullName(),
              email: faker.internet.email(),
              created_at: faker.date.recent(),
            };
          },
        });
        // console.log('fake', await Array.fromAsync(rowGen()));
        const chunkedCols = rowsToColumnsChunks(rowGen(), 2048);
        // console.log('fake', await Array.fromAsync(chunkedCols));
        // @ts-expect-error find time to decide
        const _inserted = await sqlDuck.toTable('memory_db.test', chunkedCols);

        const query = await conn.runAndReadAll(
          'SELECT count(*) as count_star from memory_db.test'
        );
        const data = query.getRowObjects();
        expect(data).toStrictEqual([
          {
            count_star: BigInt(limit),
          },
        ]);
      });
    },
    testTimeout
  );
});
