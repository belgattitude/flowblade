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

import { SqlDuck, Table, zodCodecs } from '../../../src';
import { createContainerMssql } from '../create-container-mssql';
import { createDuckdbTestMemoryDb } from '../utils/create-duckdb-test-memory-db';

const mssqlImage = 'mcr.microsoft.com/mssql/server:2025-latest';
const startupTimeout = isInCi ? 200_000 : 60_000;

const positiveBigint = 9_223_372_036_854_775_807n;
const negativeBigint = -9_223_372_036_854_775_808n;

type DB = {
  TestTable: {
    id: number;
    name: string;
    // tedious doesn't support returning numbers as bigint,
    // they're send as string
    positive_bigint: string | null;
    negative_bigint: string | null;
    null_column: number | null;
  };
};

const testDataCount = isInCi ? 2500 : 5000;

const data = Array.from({ length: testDataCount }).map((_v, idx) => {
  return {
    id: idx,
    name: `name-${idx}`,
  };
});

const getMigrations = (
  sqlServerDs: KyselyDatasource<DB>
): {
  up: () => Promise<void>;
  down: () => Promise<void>;
} => {
  return {
    up: async () => {
      await sqlServerDs.queryOrThrow(
        sql`CREATE TABLE TestTable (
               id INT PRIMARY KEY, 
               name NVARCHAR(255) NOT NULL,
               positive_bigint BIGINT,
               negative_bigint BIGINT,
               null_column INT 
        );`
      );

      const insert = sql`

        DECLARE @Data NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
        SET @Data = ${JSON.stringify(data)};

        INSERT INTO TestTable (id, name)
        SELECT id, name
        FROM OPENJSON(@Data) WITH (
          id INT,
          name NVARCHAR(255)
          );
      `;

      await sqlServerDs.queryOrThrow(insert);

      await sqlServerDs.queryOrThrow(sql`
           update TestTable set 
             positive_bigint = ${positiveBigint},
             negative_bigint = ${negativeBigint}          
      `);
    },
    down: async () => {
      await sqlServerDs.query(sql`DROP TABLE TestTable;`);
    },
  };
};

const testTimeout = 10_000;
describe('MSSQL e2e tests', () => {
  let container: StartedMSSQLServerContainer;
  let mssqlDs: KyselyDatasource<DB>;
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    mssqlDs = createContainerMssql(container);
    await getMigrations(mssqlDs).up();

    duckConn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? '128M' : '256M',
      threads: 1,
    });
  }, startupTimeout);

  afterAll(async () => {
    await getMigrations(mssqlDs).down();
    await mssqlDs.getConnection().destroy();
    await container.stop();
    duckConn.closeSync();
  });

  describe('DB test', () => {
    it(
      'should retrieve dataset from source',
      async () => {
        const query = mssqlDs.queryBuilder
          .selectFrom('TestTable as t')
          .select([
            't.id',
            't.name',
            't.positive_bigint',
            't.negative_bigint',
            't.null_column',
          ]);

        const { data, error } = await mssqlDs.query(query);
        expect(error).toBeUndefined();
        expect(data?.[0]).toStrictEqual({
          id: 0,
          name: 'name-0',
          // Cause mssql / tedious sends bigint as strings
          positive_bigint: positiveBigint.toString(10),
          negative_bigint: negativeBigint.toString(10),
          null_column: null,
        });
      },
      testTimeout
    );
  });
  describe('ToTable', () => {
    it('should store the data into duckdb', async () => {
      const query = mssqlDs.queryBuilder
        .selectFrom('TestTable as t')
        .select([
          't.id',
          't.name',
          't.positive_bigint',
          'negative_bigint',
          'null_column',
        ]);

      const rowStream = mssqlDs.stream(query, {
        chunkSize: 1000,
      });

      const dbName = 'memory_db';
      const testTable = new Table({
        name: 'test_table',
        database: dbName,
      });

      // Arrange
      await duckConn.run(`ATTACH ':memory:' AS ${dbName} (COMPRESS 'true')`);

      const sqlDuck = new SqlDuck({
        conn: duckConn,
        logger: (msg) => {
          console.log(msg);
        },
      });

      const testSchema = z.object({
        id: z.number().meta({ primaryKey: true }),
        name: z.string(),
        positive_bigint: z.nullable(zodCodecs.bigintToString),
        negative_bigint: z.nullable(zodCodecs.bigintToString),
        null_column: z.nullable(z.number()),
      });

      const { totalRows } = await sqlDuck.toTable({
        table: testTable,
        schema: testSchema,
        rowStream,
      });
      expect(totalRows).toBe(testDataCount);

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
      expect(result.data).toStrictEqual(
        data.map((row) => {
          return {
            ...row,
            negative_bigint: negativeBigint.toString(10),
            positive_bigint: positiveBigint.toString(10),
            null_column: null,
          };
        })
      );
    });
  });
});
