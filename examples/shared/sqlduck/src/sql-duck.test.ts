import { describe } from 'vitest';

import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
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
      const rows = [
        { id: 1, name: 'Alice', created_at: new Date('2022-12-01 11:00:00z') },
        { id: 2, name: 'Bob', created_at: new Date('2022-12-01 11:00:00z') },
      ];
      const columns = convertRowsToCols(rows);
      const reader = await sqlDuck.toTable('memory_db.test', columns);
      await reader.readAll();
      const data = reader.getRowObjects();
      // expect(data).toStrictEqual(rows);
      expect(data).toMatchSnapshot();
    });
  });
});
