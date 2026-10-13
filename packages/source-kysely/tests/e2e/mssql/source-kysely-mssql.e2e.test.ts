import {
  configure,
  getConsoleSink,
  type LogRecord,
  reset,
} from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";
import { type InferResult, sql } from "kysely";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  inject,
  it,
} from "vitest";

import {
  flowbladeLogtapeKyselyConfig,
  type KyselyDatasource,
} from "../../../src";
import { createMssqlDatasource } from "./create-mssql-datasource.ts";
import type { mssqlE2eDb } from "./get-mssql-e2e-migrations.ts";

describe("MSSQL e2e tests", () => {
  let ds: KyselyDatasource<mssqlE2eDb>;

  beforeAll(() => {
    // The container is started and seeded once in ./global-setup.ts
    ds = createMssqlDatasource<mssqlE2eDb>(inject("mssql"));
    return async () => {
      await ds.getConnection().destroy();
    };
  });

  describe("Datasource sqlserver", () => {
    describe("Kysely raw queries", () => {
      it("should return typed rows for a raw query", async () => {
        type Row = {
          one: number;
        };

        const rawSql = sql<Row>`SELECT 1 as one`;
        const result = await ds.query(rawSql);

        expect(result.isOk()).toBe(true);
        expect(result.meta).toBeDefined();
        expect.assert(result.data);
        expect(result.data).toStrictEqual([{ one: 1 }]);
        expectTypeOf(result.data).toEqualTypeOf<Row[]>();
      });

      it("should return the error and its span for an invalid query", async () => {
        type Row = {
          one: number;
        };

        const rawSql = sql<Row>`SELECT FROM 1 as invalid_query`;
        const result = await ds.query(rawSql, {
          name: "Error query",
        });

        expect(result.isOk()).toBe(false);

        expect(result.data).toBeUndefined();
        expect(result.error).toStrictEqual({
          message: "Incorrect syntax near the keyword 'FROM'.",
        });
        const [firstSpan] = result.meta.getSpans();
        expect.assert(firstSpan);
        const { timeMs: _t, ...restFirstSpan } = firstSpan;
        expect(restFirstSpan).toMatchObject({
          affectedRows: expect.any(Number),
          params: [],
          type: "sql",
          sql: "SELECT FROM 1 as invalid_query",
        });
      });

      it("should pass the params of a raw query", async () => {
        type Row = {
          one: number;
        };
        const params = {
          number: 1,
          string: "Hello",
        };

        const rawSql = sql<Row>`
          SELECT 1 as one
          WHERE 1 = ${params.number}
          AND 'Hello' like ${params.string}
      `;
        const result = await ds.query(rawSql, {
          name: "Retrieve something",
        });

        expect(result.isOk()).toBe(true);
        expect.assert(result.data);
        expect(result.data).toStrictEqual([{ one: 1 }]);
        expectTypeOf(result.data).toEqualTypeOf<Row[]>();
        const [firstSpan] = result.meta.getSpans();
        expect.assert(firstSpan);
        const { timeMs: _t, ...restFirstSpan } = firstSpan;
        expect(restFirstSpan).toMatchObject({
          affectedRows: expect.any(Number),
          params: [1, "Hello"],
          type: "sql",
          sql: expect.any(String),
        });
      });

      it("should return the error of a multiple statements query", async () => {
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

      it("should return the result of a multiple statements upsert", async () => {
        const params = [
          { id: 10_000_000, name: "UpsertTest - Brand A" },
          { id: 10_000_001, name: "UpsertTest - Brand B" },
          { id: 10_000_002, name: "UpsertTest - Brand C" },
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
    });

    describe("Kysely with query builder", () => {
      it("should run a query built with the query builder", async () => {
        const pastDate = new Date(Date.parse("2025-01-09T23:30:57.701Z"));
        const query = ds.queryBuilder
          .selectFrom("TestTable as t")
          .select(["t.id", "t.created_at"])
          .leftJoin("TestTableLinked as tt", "t.id", "tt.test_table_id")
          .where("t.created_at", ">", pastDate)
          .orderBy("t.name", "desc");

        const result = await ds.query(query, {
          name: "get-some-brands",
        });

        const { data, meta, error } = result;

        expect(error).toBeUndefined();
        expect(meta.getSpans()).toHaveLength(1);
        expect.assert(data);
        expect(data[0]).toMatchObject({
          id: expect.any(Number),
          created_at: expect.any(Date),
        });
        const [firstSpan] = result.meta.getSpans();
        expect.assert(firstSpan);
        const { timeMs: _t, ...restFirstSpan } = firstSpan;
        expect(restFirstSpan).toMatchObject({
          affectedRows: expect.any(Number),
          params: [pastDate],
          type: "sql",
          sql: 'select "t"."id", "t"."created_at" from "TestTable" as "t" left join "TestTableLinked" as "tt" on "t"."id" = "tt"."test_table_id" where "t"."created_at" > @1 order by "t"."name" desc',
        });
        expectTypeOf(data).toEqualTypeOf<InferResult<typeof query>>();
      });
    });

    describe("Streams with query builder", () => {
      it("should stream the rows of a query", async () => {
        const query = ds.queryBuilder
          .selectFrom("TestTable as t")
          .select(["t.id"]);

        const result = ds.stream(query);
        const data = await Array.fromAsync(result);
        expect(data[0]).toMatchObject({
          id: expect.any(Number),
        });
      });

      it("should release the connection when the stream is left early", async () => {
        const query = ds.queryBuilder
          .selectFrom("TestTable as t")
          .select(["t.id"]);

        // More early exits than connections in the pool (max: 4), a leaked
        // connection would make the following query wait until the test times out
        for (let i = 0; i < 6; i++) {
          for await (const _row of ds.stream(query)) {
            break;
          }
        }

        const { data } = await ds.queryOrThrow(
          sql<{ ok: number }>`SELECT 1 as ok`
        );
        expect(data).toStrictEqual([{ ok: 1 }]);
      });
    });

    describe("queryOrThrow", () => {
      it("should not throw when the query is ok", async () => {
        const rawSql = sql<{ ok: number }>`SELECT 1 as ok`;
        const { data } = await ds.queryOrThrow(rawSql);
        expect(data).toStrictEqual([{ ok: 1 }]);
      });

      it("should throw when the query couldn't be executed", async () => {
        const rawSql = sql<{ ok: number }>`SELECT FRM 1`;
        await expect(
          ds.queryOrThrow(rawSql, {
            name: "nok query",
          })
        ).rejects.toThrow("Query failed: Incorrect syntax near '1'.");
      });
    });
  });

  describe("Logger", () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configure({
        sinks: {
          buffer: (record) => {
            logBuffer.push(record);
          },
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
            category: ["logtape", "meta"],
            lowestLevel: "error",
            sinks: ["console"],
          },
          {
            category: ["flowblade", "kysely"],
            lowestLevel: "debug",
            sinks: ["buffer"],
          },
        ],
      });
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it("should log success", async () => {
      const { meta } = await ds.query(sql`SELECT 'test'`, {
        name: "TEST",
      });
      expect(logBuffer[0]).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: "debug",
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', "TEST", '"'],
        properties: {
          queryName: "TEST",
          sql: "SELECT 'test'",
          params: [],
        },
      });
      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: "info",
        rawMessage:
          'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        message: [
          'Query "',
          "TEST",
          '" executed in ',
          meta.getTotalTimeMs(),
          "ms, affected ",
          1,
          " row(s)",
        ],
        properties: {
          queryName: "TEST",
          sql: "SELECT 'test'",
          params: [],
          affectedRows: 1,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });

    it("should log error", async () => {
      const { meta } = await ds.query(sql`SELECT err`, {
        name: "ERROR",
      });
      expect(logBuffer[0]).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: "debug",
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', "ERROR", '"'],
        properties: {
          queryName: "ERROR",
          sql: "SELECT err",
          params: [],
        },
      });
      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeKyselyConfig.categories,
        level: "error",
        message: ['Query "', "ERROR", "\" failed: Invalid column name 'err'."],
        rawMessage: "Query \"{queryName}\" failed: Invalid column name 'err'.",
        properties: {
          queryName: "ERROR",
          sql: "SELECT err",
          params: [],
          affectedRows: 0,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });
  });
});
