import type { DuckDBConnection } from '@duckdb/node-api';
import * as z from 'zod';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';

import { DuckDatabaseManager, SqlDuck, Table } from '../../../src';

describe('basic appender', () => {
  let conn: DuckDBConnection;

  beforeAll(async () => {
    conn = await createDuckdbTestMemoryDb();
  });
  afterAll(async () => {
    conn.closeSync();
  });

  describe('toTable', () => {
    it('should work', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attach({
        type: 'memory', // can be 'duckdb', ...
        alias: 'mydb',
        options: { compress: false },
      });

      const sqlDuck = new SqlDuck({ conn });

      // Define a zod schema, it will be used to create the table
      const userSchema = z.object({
        id: z.int32().min(1).meta({ primaryKey: true }),
        name: z.string(),
      });

      // Example of a datasource (can be generator, async generator, async iterable)
      async function* getUsers(): AsyncIterableIterator<
        z.infer<typeof userSchema>
      > {
        // database or api call
        yield { id: 1, name: 'John' };
        yield { id: 2, name: 'Jane' };
      }

      // Create a table from the schema and the datasource
      const result = await sqlDuck.toTable({
        table: new Table({ name: 'user', database: database.alias }),
        schema: userSchema, // The schema to use to create the table
        rowStream: getUsers(), // The async iterable that yields rows
        // 👇Optional:
        chunkSize: 2048, // Number of rows to append when using duckdb appender. Default is 2048
        onDataAppended: ({ timeMs, totalRows, rowsPerSecond }) => {
          console.log(
            `Appended ${totalRows} in time ${timeMs}ms, est: ${rowsPerSecond} rows/s`
          );
        },
        // Optional table creation options
        createOptions: {
          create: 'CREATE_OR_REPLACE',
        },
      });
      expect(result).toStrictEqual({
        timeMs: expect.any(Number),
        totalRows: 2,
        createTableDDL: expect.stringMatching(/^CREATE OR REPLACE TABLE(.*)/),
      });

      const reader = await conn.runAndReadAll('select * from mydb.user');
      expect(reader.getRowObjectsJS()).toMatchSnapshot();
    });
  });
});
