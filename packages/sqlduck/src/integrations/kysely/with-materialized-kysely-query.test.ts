import type { DuckDBConnection } from "@duckdb/node-api";
import * as z from "zod";

import { createDuckdbTestMemoryDb } from "#/tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#/tests/utils/create-dummy-kysely-db.ts";

import { KyselyMaterializableTable } from "./kysely-materializable-table.ts";
import { withMaterializedKyselyQuery } from "./with-materialized-kysely-query.ts";

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

    const data = await withMaterializedKyselyQuery({
      duckConn,
      table,
      query: async ({ duckConn }) => {
        const reader = await duckConn.runAndReadAll("SELECT * FROM cool");
        return reader.getRowObjectsJS();
      },
    });

    expect(data).toStrictEqual({
      data: [],
      meta: {
        create: {
          ddl: expect.stringMatching(/^CREATE TABLE*/),
          rows: 0,
          timeMs: expect.any(Number),
        },
      },
    });
  });
});
