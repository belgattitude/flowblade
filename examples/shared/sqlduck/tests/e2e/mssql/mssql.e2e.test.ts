import type { KyselyDatasource } from '@flowblade/source-kysely';
import { MSSQLServerContainer } from '@testcontainers/mssqlserver';
import type { StartedMSSQLServerContainer } from '@testcontainers/mssqlserver/build/mssqlserver-container';
import isInCi from 'is-in-ci';
import { sql } from 'kysely';
import { describe } from 'vitest';

import { SqlDuck } from '../../../src';
import { createContainerMssql } from '../create-container-mssql';
import { createDuckDBE2EMemoryDb } from '../create-duckdb-e2e-memory-db';

const mssqlImage = 'mcr.microsoft.com/mssql/server:2025-latest';
const startupTimeout = isInCi ? 120_000 : 60_000;

const generateTestTable = async (ds: KyselyDatasource<any>) => {
  await ds.query(
    sql`CREATE TABLE TestTable (id INT PRIMARY KEY, name NVARCHAR(100));`
  );
};

describe('MSSQL e2e tests', () => {
  let container: StartedMSSQLServerContainer;
  let ds: KyselyDatasource<any>;
  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    ds = createContainerMssql(container);
  }, startupTimeout);

  afterAll(async () => {
    await ds.getConnection().destroy();
    await container.stop();
  });

  describe('toDuckdb', () => {
    it('should connect to database', async () => {
      const { data } = await ds.query(sql<{ id: number }>`SELECT 1 AS id`);
      expect(data).toStrictEqual([{ id: 1 }]);
    }, 5000);
    it('should', async () => {
      const conn = await createDuckDBE2EMemoryDb();
      const sqlDuck = new SqlDuck({ conn });

      const columns = [
        [42, 123, 17],
        ['duck', 'mallad', 'goose'],
      ];
      const reader = await sqlDuck.test(columns);
      await reader.readAll();
      const data = reader.getColumns();
      expect(data).toStrictEqual(columns);
    });
  });
});
