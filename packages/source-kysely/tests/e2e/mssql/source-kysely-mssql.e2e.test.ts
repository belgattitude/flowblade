import {
  configure,
  getConsoleSink,
  type LogRecord,
  reset,
} from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';
import { MSSQLServerContainer } from '@testcontainers/mssqlserver';
import type { StartedMSSQLServerContainer } from '@testcontainers/mssqlserver/build/mssqlserver-container';
import isInCi from 'is-in-ci';
import { type InferResult, sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, expectTypeOf } from 'vitest';

import {
  flowbladeLogtapeKyselyConfig,
  type KyselyDatasource,
} from '../../../src';
import { createContainerMssql } from '../create-container-mssql';

const mssqlImage = 'mcr.microsoft.com/mssql/server:2025-latest';

const startupTimeout = isInCi ? 200_000 : 60_000;

const positiveBigint = 9_223_372_036_854_775_807n;
const negativeBigint = -9_223_372_036_854_775_808n;

type DB = {
  TestTable: {
    id: number;
    name: string;
    // tedious doesn't support returning numbers as bigint,
    // they're sent as string
    positive_bigint: string | null;
    negative_bigint: string | null;
    null_column: number | null;
    created_at: Date;
  };
  TestTableLinked: {
    id: number;
    name: string;
    test_table_id: number | null;
  };
};

const testDataCount = isInCi ? 10 : 100;

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
               null_column INT,
               created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
        );`
      );

      await sqlServerDs.queryOrThrow(
        sql`CREATE TABLE TestTableLinked (
               id INT PRIMARY KEY, 
               name NVARCHAR(255) NOT NULL,
               test_table_id INT
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
  let ds: KyselyDatasource<DB>;

  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    ds = createContainerMssql(container);
    await getMigrations(ds).up();
  }, startupTimeout);

  afterAll(async () => {
    await getMigrations(ds).down();
    await ds.getConnection().destroy();
    await container.stop();
  });

  describe('Datasource sqlserver', () => {
    describe(
      'Kysely raw queries',
      () => {
        it('01. basicQuery', async () => {
          type Row = {
            one: number;
          };

          const rawSql = sql<Row>`SELECT 1 as one`;
          const result = await ds.query(rawSql);

          expect(result.isOk()).toBe(true);
          expect(result.meta).toBeDefined();
          expect(result.data).toStrictEqual([{ one: 1 }]);
          expectTypeOf(result.data!).toEqualTypeOf<Row[]>();
        });

        it('02. errorQuery', async () => {
          type Row = {
            one: number;
          };

          const rawSql = sql<Row>`SELECT FROM 1 as invalid_query`;
          const result = await ds.query(rawSql, {
            name: 'Error query',
          });

          expect(result.isOk()).toBe(false);

          expect(result.data).toBeUndefined();
          expect(result.error).toStrictEqual({
            message: "Incorrect syntax near the keyword 'FROM'.",
          });
          const firstSpan = result.meta.getSpans()[0]!;
          const { timeMs: _t, ...restFirstSpan } = firstSpan;
          expect(restFirstSpan).toMatchObject({
            affectedRows: expect.any(Number),
            params: [],
            type: 'sql',
            sql: 'SELECT FROM 1 as invalid_query',
          });
        });

        it('03. basicQuery with params', async () => {
          type Row = {
            one: number;
          };
          const params = {
            number: 1,
            string: 'Hello',
          };

          const rawSql = sql<Row>`
          SELECT 1 as one
          WHERE 1 = ${params.number}
          AND 'Hello' like ${params.string}
      `;
          const result = await ds.query(rawSql, {
            name: 'Retrieve something',
          });

          expect(result.isOk()).toBe(true);
          expect(result.data).toStrictEqual([{ one: 1 }]);
          expectTypeOf(result.data!).toEqualTypeOf<Row[]>();
          const firstSpan = result.meta.getSpans()[0]!;
          const { timeMs: _t, ...restFirstSpan } = firstSpan;
          expect(restFirstSpan).toMatchObject({
            affectedRows: expect.any(Number),
            params: [1, 'Hello'],
            type: 'sql',
            sql: expect.any(String),
          });
        });

        it('multiple line queries errors', async () => {
          const qRaw = sql`
          DELETE FRM qsqdfqsldkjf like '';    
          SELECT WHERE;
        `;
          const result = await ds.query(qRaw);
          const { error } = result;
          expect(error).toStrictEqual({
            message: "Incorrect syntax near 'qsqdfqsldkjf'.",
          });
        });

        it('upsert some data with multi line queries', async () => {
          const params = [
            { id: 10_000_000, name: 'UpsertTest - Brand A' },
            { id: 10_000_001, name: 'UpsertTest - Brand B' },
            { id: 10_000_002, name: 'UpsertTest - Brand C' },
          ];

          const qRaw = sql`
           DELETE FROM TestTable WHERE name like 'UpsertTest%';    
           INSERT INTO TestTable (id, name, created_at) 
            SELECT id, name, CURRENT_TIMESTAMP
            FROM OPENJSON(${JSON.stringify(params)}) WITH (
               id INT, 
               name NVARCHAR(255)
            )
          SELECT id, name FROM TestTable WHERE name like 'UpsertTest%';
      `;
          const result = await ds.query(qRaw);
          const { error, data } = result;
          expect(error).toBeUndefined();
          expect(data).toStrictEqual(params);
        });
      },
      testTimeout
    );

    describe(
      'Kysely with query builder',
      () => {
        it('select: get some brands', async () => {
          const pastDate = new Date(Date.parse('2025-01-09T23:30:57.701Z'));
          const query = ds.queryBuilder
            .selectFrom('TestTable as t')
            .select(['t.id', 't.created_at'])
            .leftJoin('TestTableLinked as tt', 't.id', 'tt.test_table_id')
            .where('t.created_at', '>', pastDate)
            .orderBy('t.name', 'desc');

          const result = await ds.query(query, {
            name: 'get-some-brands',
          });

          const { data, meta, error } = result;

          expect(error).toBeUndefined();
          expect(meta.getSpans().length).toBe(1);
          expect(data![0]!).toMatchObject({
            id: expect.any(Number),
            created_at: expect.any(Date),
          });
          const firstSpan = result.meta.getSpans()[0]!;
          const { timeMs: _t, ...restFirstSpan } = firstSpan;
          expect(restFirstSpan).toMatchObject({
            affectedRows: expect.any(Number),
            params: [pastDate],
            type: 'sql',
            sql: 'select "t"."id", "t"."created_at" from "TestTable" as "t" left join "TestTableLinked" as "tt" on "t"."id" = "tt"."test_table_id" where "t"."created_at" > @1 order by "t"."name" desc',
          });
          expectTypeOf(data!).toEqualTypeOf<InferResult<typeof query>>();
        });
      },
      testTimeout
    );

    describe(
      'Streams with query builder',
      () => {
        it('select: get some brands', async () => {
          const query = ds.queryBuilder
            .selectFrom('TestTable as t')
            .select(['t.id']);

          const result = ds.stream(query);
          const data = await Array.fromAsync(result);
          expect(data[0]!).toMatchObject({
            id: expect.any(Number),
          });
        });
      },
      testTimeout
    );

    describe(
      'queryOrThow',
      () => {
        it('should not throw when the query is ok', async () => {
          const rawSql = sql<{ ok: number }>`SELECT 1 as ok`;
          const { data } = await ds.queryOrThrow(rawSql);
          expect(data).toStrictEqual([{ ok: 1 }]);
        });

        it("should throw when the query couldn't be executed", async () => {
          const rawSql = sql<{ ok: number }>`SELECT FRM 1`;
          await expect(() => {
            return ds.queryOrThrow(rawSql, {
              name: 'nok query',
            });
          }).rejects.toThrowError("Query failed: Incorrect syntax near '1'.");
        });
      },
      testTimeout
    );
  });

  describe('Logger', () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configure({
        sinks: {
          buffer: logBuffer.push.bind(logBuffer),
          console: getConsoleSink({
            nonBlocking: {
              bufferSize: 1000, // Flush after 1000 records
              flushInterval: 50, // Flush every 50ms
            },
            formatter: prettyFormatter,
          }),
        },
        loggers: [
          {
            category: ['logtape', 'meta'],
            lowestLevel: 'error',
            sinks: ['console'],
          },
          {
            category: ['flowblade', 'kysely'],
            lowestLevel: 'debug',
            sinks: ['buffer'],
          },
        ],
      });
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it('should log success', async () => {
      const { meta } = await ds.query(sql`SELECT 'test'`, {
        name: 'TEST',
      });
      expect(logBuffer[0]!).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: 'debug',
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', 'TEST', '"'],
        properties: {
          queryName: 'TEST',
          sql: "SELECT 'test'",
          params: [],
        },
      });
      expect(logBuffer[1]!).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: 'info',
        rawMessage:
          'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        message: [
          'Query "',
          'TEST',
          '" executed in ',
          meta.getTotalTimeMs(),
          'ms, affected ',
          1,
          ' row(s)',
        ],
        properties: {
          queryName: 'TEST',
          sql: "SELECT 'test'",
          params: [],
          affectedRows: 1,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });

    it('should log error', async () => {
      const { meta } = await ds.query(sql`SELECT err`, {
        name: 'ERROR',
      });
      expect(logBuffer[0]!).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: 'debug',
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', 'ERROR', '"'],
        properties: {
          queryName: 'ERROR',
          sql: 'SELECT err',
          params: [],
        },
      });
      expect(logBuffer[1]!).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: 'error',
        message: ['Query "', 'ERROR', '" failed'],
        rawMessage: 'Query "{queryName}" failed',
        properties: {
          queryName: 'ERROR',
          sql: 'SELECT err',
          params: [],
          affectedRows: 0,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });
  });
});
