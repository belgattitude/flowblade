import { describe } from 'vitest';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsGenerator } from '../tests/utils/create-fake-rows-generator';
import { convertRowsToCols } from './convert/convert-rows-to-cols';
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
      const limit = 2048; // Duckdb max rows:  A data chunk cannot have more than 2048 rows
      const rowGen = createFakeRowsGenerator({
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
      const rows = await Array.fromAsync(rowGen());

      const columns = convertRowsToCols(rows);
      const reader = await sqlDuck.toTable('memory_db.test', columns);
      await reader.readAll();
      const data = reader.getRowObjects();
      expect(data.length).toStrictEqual(limit);
    });
  });
});
