import { describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsIterator } from '../tests/utils/create-fake-rows-iterator';
import { rowsToColumnsChunk } from '../tests/utils/rows-to-columns';
import { SqlDuck } from './sql-duck';

describe('Duckdb tests', () => {
  describe('toDuckdb', () => {
    it('should', async () => {
      const conn = await createDuckdbTestMemoryDb();
      await conn.run(
        // `ATTACH ':memory:' AS memory_db (ACCESS_MODE 'READ_WRITE', COMPRESS 'true')`
        `ATTACH ':memory:' AS memory_db (COMPRESS 'true')`
      );
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
      const limit = 1_000_000;

      const rowGen = createFakeRowsIterator({
        count: limit,
        schema: userSchema,
        factory: ({ faker }) => {
          return {
            id: faker.number.int(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            created_at: faker.date.recent(),
          };
        },
      });
      const chunkedCols = rowsToColumnsChunk(rowGen(), 2000);
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
  }, 10_000);
});
