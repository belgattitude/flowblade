import type { DuckDBConnection } from "@duckdb/node-api";
import type { KyselyDatasource } from "@flowblade/source-kysely";
import { sql as sqlt } from "@flowblade/sql-tag";
import isInCi from "is-in-ci";
import { beforeAll, describe, expect, inject, it } from "vitest";
import * as z from "zod";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";

import { zodCodecs } from "../../../src/index.ts";
import { withMaterializedKyselyQuery } from "../../../src/integrations/kysely/index.ts";
import { KyselyQueryWithZodSchema } from "../../../src/integrations/kysely/kysely-query-with-zod-schema.ts";
import { createMssqlDatasource } from "./create-mssql-datasource.ts";
import { type mssqlE2eDb, testDataCount } from "./get-mssql-e2e-migrations.ts";

describe("MSSQL materialized e2e tests", () => {
  let mssqlDs: KyselyDatasource<mssqlE2eDb>;
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    // The container is started and seeded once in ./global-setup.ts
    mssqlDs = createMssqlDatasource<mssqlE2eDb>(inject("mssql"));
    const duckDb = await openDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? "128M" : "256M",
      threads: 1,
    });
    ({ conn: duckConn } = duckDb);

    // Returned cleanup only runs for what was set up above
    return async () => {
      duckDb.close();
      await mssqlDs.getConnection().destroy();
    };
  });

  describe("Materialized duckdb test", () => {
    it("should materialize the mssql query into duckdb", async () => {
      const query = mssqlDs.queryBuilder.selectFrom("TestTable as t").select([
        "t.id",
        "t.name",
        "t.positive_bigint",
        "t.negative_bigint",
        "t.null_column",
        "t.decimal_18_3", // https://github.com/tediousjs/tedious/issues/1675 - sql`CAST(t.decimal_18_3 AS VARCHAR(30))`.as("decimal_18_3"),
        //"t.iso_date",
      ]);

      const sqlserverResult = await mssqlDs.queryOrThrow(query);

      const queryWithSchema = new KyselyQueryWithZodSchema({
        query,
        schema: z.strictObject({
          id: z.int32().meta({ primaryKey: true }),
          name: z.string(),
          positive_bigint: z.nullable(zodCodecs.bigintToString),
          negative_bigint: z.nullable(zodCodecs.bigintToString),
          null_column: z.nullable(z.number()),
          decimal_18_3: z.float32().meta({
            multipleOf: 0.001,
          }),
          //iso_date: z.nullable(z.iso.date()),
        }),
      });

      const result = await withMaterializedKyselyQuery({
        duckConn,
        table: queryWithSchema,
        query: async ({ dsDuck, table }) =>
          await dsDuck.query(
            sqlt<{
              id: number;
            }>`SELECT * FROM ${sqlt.raw(table.getFullName())}`
          ),
      });

      expect(result.isError()).toBe(false);

      const normalizedData = sqlserverResult.data.map((row) => {
        return {
          ...row,
          decimal_18_3: row.decimal_18_3?.toFixed(3),
        };
      });

      expect(result.data).toStrictEqual(normalizedData);
      const [materializationSpan] =
        result.meta.getSpansByType("materialization");
      expect(materializationSpan?.affectedRows).toStrictEqual(testDataCount);
    });
  });
});
