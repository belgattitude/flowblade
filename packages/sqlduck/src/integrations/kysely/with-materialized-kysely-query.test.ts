import type { DuckDBConnection } from "@duckdb/node-api";
import { sql } from "@flowblade/sql-tag";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import * as z from "zod";

import { createDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#tests/utils/create-dummy-kysely-db.ts";

import { Table } from "../../objects/table.ts";
import { KyselyMaterializableTable } from "./kysely-materializable-table.ts";
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

    const table = new KyselyMaterializableTable({
      sourceQuery: query,
      schema,
    });

    const result = await withMaterializedKyselyQuery({
      duckConn,
      table,
      query: async ({ dsDuck, table }) => {
        const result = await dsDuck.query(
          sql`SELECT * FROM ${sql.raw(table.getFullName())}`
        );
        console.log("AAAA", result);
        return result;
      },
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

    /*
    expect(result).toMatchSnapshot();

    expect(result).toStrictEqual({
      data: [],
      meta: {
        create: {
          ddl: expect.stringMatching(/^CREATE TABLE/),
          rows: 0,
          timeMs: expect.any(Number),
          table: expect.any(Table)
        },
      },
    });
*/
  });
});
