import type { DuckDBConnection } from "@duckdb/node-api";
import { sql } from "@flowblade/sql-tag";
import * as z from "zod";

import { createDuckdbTestMemoryDb } from "#/tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#/tests/utils/create-dummy-kysely-db.ts";

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
        const result =  await dsDuck.query(
          sql`SELECT * FROM ${sql.raw(table.getFullName())}`
        );
        console.log('AAAA', result);
        return result;
      },
    });

    expect(result.isError()).toBe(false);

    const { data, meta, error } = result;
    expect(error).toBeUndefined();

    const spans = meta.getSpans();
    expect(spans.length).toBe(2);
    expect(meta.getSpansByType("materialization").length).toBe(1);
   // expect(meta.getLatestSpan()?.type).toBe("sql");

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
