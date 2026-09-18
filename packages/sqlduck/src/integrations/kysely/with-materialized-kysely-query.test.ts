import type { DuckDBConnection } from "@duckdb/node-api";
import * as z from "zod";
import { Table } from '../../objects/table.ts';

import { createDuckdbTestMemoryDb } from "#/tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#/tests/utils/create-dummy-kysely-db.ts";

import { KyselyMaterializableTable } from "./kysely-materializable-table.ts";
import { withMaterializedKyselyQuery } from "./with-materialized-kysely-query.ts";
import {sql} from "@flowblade/sql-tag";

describe("withMaterializedKyselyQuery", () => {
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    duckConn = await createDuckdbTestMemoryDb();
  });
  afterAll(async () => {
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
      id: z.number(),
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
        return await dsDuck.query(sql`SELECT * FROM ${sql.raw(table.getFullName())}`);
      },
    });


    expect(result.isError()).toBe(false);

    const {data, meta} = result;

    console.log('meata', meta.getSpans());

    expect(meta.getSpansByType('materialization').length).toBe(1);

    const spans = meta.getSpans();;
    expect(spans.length).toBe(2)

    expect(meta.getLatestSpan()?.type).toBe('sql')

    /*
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
