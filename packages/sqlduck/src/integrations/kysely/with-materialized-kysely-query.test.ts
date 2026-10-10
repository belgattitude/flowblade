import type { DuckDBConnection } from "@duckdb/node-api";
import { createQResultSuccess, QMeta } from "@flowblade/core";
import { sql } from "@flowblade/sql-tag";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import * as z from "zod";

import { createDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#tests/utils/create-dummy-kysely-db.ts";

import { Table } from "../../objects/table.ts";
import { KyselyQueryWithZodSchema } from "./kysely-query-with-zod-schema.ts";
import { withMaterializedKyselyQuery } from "./with-materialized-kysely-query.ts";

describe("withMaterializedKyselyQuery", () => {
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    duckConn = await createDuckdbTestMemoryDb();
  });

  afterAll(() => {
    duckConn.closeSync();
  });

  type DB = {
    user: {
      id: number;
      name: string;
    };
  };
  const db = createDummyKyselyDb<DB>("postgresql");

  it("should materialize the query as table", async () => {
    const query = db.selectFrom("user").select(["id", "name"]);

    const schema = z.strictObject({
      id: z.int32(),
      name: z.string(),
    });

    const table = new KyselyQueryWithZodSchema({
      query,
      schema,
    });

    const result = await withMaterializedKyselyQuery({
      duckConn,
      table,
      query: async ({ dsDuck, table }) =>
        await dsDuck.query(
          sql<{
            id: number;
            name: string;
          }>`SELECT * FROM ${sql.raw(table.getFullName())}`
        ),
    });

    expect(result.isError()).toBe(false);

    const { data, meta, error } = result;
    expect(error).toBeUndefined();

    const spans = meta.getSpans();
    expect(spans).toHaveLength(2);
    const [materializationSpan, ...otherSpans] =
      meta.getSpansByType("materialization");
    expect(otherSpans).toHaveLength(0);
    expect(materializationSpan).toMatchObject({
      type: "materialization",
      ddl: expect.stringMatching(/^CREATE TABLE/),
      tableName: expect.stringMatching(/^_materialized/),
      affectedRows: expect.any(Number),
      timeMs: expect.any(Number),
    });
    // spans must survive a map (QMeta.withSpan) and JSON serialization
    const mapped = result.map((row) => row);
    expect(mapped.meta.getSpans().map((span) => span.type)).toStrictEqual([
      "materialization",
      "sql",
      "map",
    ]);
    expect(() => JSON.stringify(mapped.meta)).not.toThrow();
    expect(spans.map((span) => span.type)).toStrictEqual([
      "materialization",
      "sql",
    ]);
    expect(meta.getLatestSpan()?.type).toBe("sql");

    expect(data).toStrictEqual([]);
  });

  describe("materialized table cleanup", () => {
    const createTable = () =>
      new KyselyQueryWithZodSchema({
        query: db.selectFrom("user").select(["id", "name"]),
        schema: z.strictObject({ id: z.int32(), name: z.string() }),
      });

    const tableExists = async (name: string) => {
      const reader = await duckConn.runAndReadAll(
        `SELECT count(*) AS count FROM duckdb_tables() WHERE table_name = '${name}'`
      );
      return Number(reader.getRowObjectsJS()[0]?.count) > 0;
    };

    it("should drop the table once the query is done", async () => {
      let tableName = "";
      let existedDuringQuery = false;
      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: createTable(),
        query: async ({ dsDuck, table }) => {
          tableName = table.getFullName();
          existedDuringQuery = await tableExists(tableName);
          return await dsDuck.query(
            sql<{ id: number }>`SELECT id FROM ${sql.raw(tableName)}`
          );
        },
      });
      expect(result.isError()).toBe(false);
      expect(existedDuringQuery).toBe(true);
      await expect(tableExists(tableName)).resolves.toBe(false);
    });

    it("should drop the table when the row stream throws midway", async () => {
      const failingTable = createTable();
      failingTable.getQuery = (() => {
        return {
          stream: async function* streamRows() {
            yield { id: 1, name: "a" };
            throw new Error("stream boom");
          },
        };
      }) as unknown as typeof failingTable.getQuery;

      let queryCalled = false;
      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: failingTable,
        query: async () => {
          queryCalled = true;
          return createQResultSuccess([], new QMeta({}));
        },
      });

      expect(queryCalled).toBe(false);
      expect(result.isError()).toBe(true);
      expect(result.error?.message).toMatch(
        /Can't materialize table _materialized.*stream boom/
      );
      const leftovers = await duckConn.runAndReadAll(
        `SELECT count(*) AS count FROM duckdb_tables() WHERE table_name LIKE '_materialized%'`
      );
      expect(Number(leftovers.getRowObjectsJS()[0]?.count)).toBe(0);
    });

    it("should drop the table when the query fails", async () => {
      let tableName = "";
      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: createTable(),
        query: async ({ dsDuck, table }) => {
          tableName = table.getFullName();
          return await dsDuck.query(sql`SELECT * FROM does_not_exist`);
        },
      });
      expect(result.isError()).toBe(true);
      await expect(tableExists(tableName)).resolves.toBe(false);
    });

    it("should drop the table when the query throws", async () => {
      let tableName = "";
      await expect(
        withMaterializedKyselyQuery({
          duckConn,
          table: createTable(),
          query: ({ table }) => {
            tableName = table.getFullName();
            throw new Error("boom");
          },
        })
      ).rejects.toThrow("boom");
      expect(tableName).not.toBe("");
      await expect(tableExists(tableName)).resolves.toBe(false);
    });
  });

  describe("database and schema options", () => {
    const createTable = () =>
      new KyselyQueryWithZodSchema({
        query: db.selectFrom("user").select(["id", "name"]),
        schema: z.strictObject({ id: z.int32(), name: z.string() }),
      });

    const countTables = async (where: string) => {
      const reader = await duckConn.runAndReadAll(
        `SELECT count(*) AS count FROM duckdb_tables() WHERE ${where}`
      );
      return Number(reader.getRowObjectsJS()[0]?.count);
    };

    beforeAll(async () => {
      await duckConn.run(`ATTACH ':memory:' AS scratch`);
      await duckConn.run(`CREATE SCHEMA scratch.staging`);
    });

    it("should create the table in the given database and schema", async () => {
      let fullName = "";
      let tablesDuringQuery = 0;
      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: createTable(),
        database: "scratch",
        schema: "staging",
        query: async ({ dsDuck, table }) => {
          fullName = table.getFullName();
          tablesDuringQuery = await countTables(
            `database_name = 'scratch' AND schema_name = 'staging' AND table_name = '${table.tableName}'`
          );
          return await dsDuck.query(
            sql<{ id: number }>`SELECT id FROM ${sql.raw(fullName)}`
          );
        },
      });

      expect(result.isError()).toBe(false);
      expect(fullName).toMatch(/^scratch\.staging\._materialized_/);
      expect(tablesDuringQuery).toBe(1);
      expect(result.meta.getSpansByType("materialization")[0]?.tableName).toBe(
        fullName
      );
      await expect(
        countTables(`database_name = 'scratch' AND schema_name = 'staging'`)
      ).resolves.toBe(0);
    });

    it.each([
      ["database", { database: "scratch; DROP TABLE x" }],
      ["schema", { schema: "staging--" }],
    ] as const)("should reject an invalid %s name", async (kind, options) => {
      let queryCalled = false;
      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: createTable(),
        ...options,
        query: async () => {
          queryCalled = true;
          return createQResultSuccess([], new QMeta({}));
        },
      });
      expect(queryCalled).toBe(false);
      expect(result.error?.message).toMatch(
        new RegExp(`^Invalid ${kind} name`)
      );
    });
  });
});
