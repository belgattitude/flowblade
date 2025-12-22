import type { DuckDBConnection } from '@duckdb/node-api';
import { DuckdbDatasource } from '@flowblade/source-duckdb';
import type { KyselyDatasource } from '@flowblade/source-kysely';
import { sql as sqlt } from '@flowblade/sql-tag';
import { MSSQLServerContainer } from '@testcontainers/mssqlserver';
import type { StartedMSSQLServerContainer } from '@testcontainers/mssqlserver/build/mssqlserver-container';
import isInCi from 'is-in-ci';
import { sql } from 'kysely';
import { describe } from 'vitest';
import * as z from 'zod';

import { SqlDuck } from '../../../src';
import { Table } from '../../../src/table/table';
import { createContainerMssql } from '../create-container-mssql';
import { createDuckdbTestMemoryDb } from '../utils/create-duckdb-test-memory-db';

const mssqlImage = 'mcr.microsoft.com/mssql/server:2025-latest';
const startupTimeout = isInCi ? 120_000 : 60_000;

type DB = {
  TestTable: {
    id: number;
    name: string;
  };
};

const data = Array.from({ length: 100 }).map((_v, idx) => {
  return { id: idx, name: `name-${idx}` };
});

const getMigrations = (
  sqlServerDs: KyselyDatasource<DB>
): {
  up: () => Promise<void>;
  down: () => Promise<void>;
} => {
  return {
    up: async () => {
      await sqlServerDs.query(
        sql`CREATE TABLE TestTable (id INT PRIMARY KEY, name NVARCHAR(100));`
      );
      await sqlServerDs
        .getConnection()
        .insertInto('TestTable')
        .values(data)
        .execute();
    },
    down: async () => {
      await sqlServerDs.query(sql`DROP TABLE TestTable;`);
    },
  };
};

const testTimeout = 10_000;
describe('MSSQL e2e tests', () => {
  let container: StartedMSSQLServerContainer;
  let sqlServerDs: KyselyDatasource<DB>;
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    sqlServerDs = createContainerMssql(container);
    await getMigrations(sqlServerDs).up();

    duckConn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? '128M' : '256M',
      threads: 1,
    });
  }, startupTimeout);

  afterAll(async () => {
    await getMigrations(sqlServerDs).down();
    await sqlServerDs.getConnection().destroy();
    await container.stop();
    duckConn.closeSync();
  });

  describe('DB test', () => {
    it(
      'should retrieve dataset from source',
      async () => {
        const query = sqlServerDs.queryBuilder
          .selectFrom('TestTable as t')
          .select(['t.id', 't.name']);
        const { data, error } = await sqlServerDs.query(query);
        expect(error).toBeUndefined();
        expect(data?.[0]).toStrictEqual({ id: 0, name: 'name-0' });
      },
      testTimeout
    );
  });
  describe('ToTable', () => {
    it('should store the data into duckdb', async () => {
      const rowStream = sqlServerDs.queryBuilder
        .selectFrom('TestTable as t')
        .select(['t.id', 't.name'])
        .stream(10);

      const dbName = 'memory_db';
      const testTable = new Table({
        name: 'test_table',
        database: dbName,
      });

      // Arrange
      await duckConn.run(`ATTACH ':memory:' AS ${dbName} (COMPRESS 'true')`);

      const sqlDuck = new SqlDuck({
        conn: duckConn,
      });

      const testSchema = z.object({
        id: z.number().meta({ primaryKey: true }),
        name: z.string(),
      });

      await sqlDuck.toTable(testTable, testSchema, rowStream);

      const duckDs = new DuckdbDatasource({
        connection: duckConn,
      });
      const result = await duckDs.query(
        sqlt<{
          id: number;
          name: string;
        }>`select columns(*) from memory_db.test_table`
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toStrictEqual(data);
    });
  });
});
