import type { KyselyDatasource } from '@flowblade/source-kysely';
import { MSSQLServerContainer } from '@testcontainers/mssqlserver';
import type { StartedMSSQLServerContainer } from '@testcontainers/mssqlserver/build/mssqlserver-container';
import isInCi from 'is-in-ci';
import { sql } from 'kysely';
import { describe } from 'vitest';

import { createContainerMssql } from '../create-container-mssql';

const mssqlImage = 'mcr.microsoft.com/mssql/server:2025-latest';
const startupTimeout = isInCi ? 120_000 : 60_000;

describe('MSSQL e2e tests', () => {
  let container: StartedMSSQLServerContainer;
  let conn: KyselyDatasource<any>;
  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    conn = createContainerMssql(container);
  }, startupTimeout);

  afterAll(async () => {
    await conn.getConnection().destroy();
    await container.stop();
  });

  describe('toDuckdb', () => {
    it('should connect to database', async () => {
      const { data } = await conn.query(sql<{ id: number }>`SELECT 1 AS id`);
      expect(data).toStrictEqual([{ id: 1 }]);
    }, 5000);
  });
});
