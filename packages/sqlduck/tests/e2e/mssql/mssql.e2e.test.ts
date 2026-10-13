import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource } from "@flowblade/source-duckdb";
import type { KyselyDatasource } from "@flowblade/source-kysely";
import { sql as sqlt } from "@flowblade/sql-tag";
import isInCi from "is-in-ci";
import { beforeAll, describe, expect, inject, it } from "vitest";
import * as z from "zod";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";

import { SqlDuck, Table, zodCodecs } from "../../../src/index.ts";
import { createMssqlDatasource } from "./create-mssql-datasource.ts";
import {
  anIsoDate,
  mssqlE2eData,
  type mssqlE2eDb,
  negativeBigint,
  positiveBigint,
  testDataCount,
} from "./get-mssql-e2e-migrations.ts";

describe("MSSQL e2e tests", () => {
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

  describe("DB test", () => {
    it("should retrieve dataset from source", async () => {
      const query = mssqlDs.queryBuilder
        .selectFrom("TestTable as t")
        .select([
          "t.id",
          "t.name",
          "t.positive_bigint",
          "t.negative_bigint",
          "t.null_column",
          "t.decimal_18_3",
          "t.iso_date",
        ]);

      const { data, error } = await mssqlDs.query(query);
      expect(error).toBeUndefined();
      expect(data?.[0]).toStrictEqual({
        id: 0,
        name: "name-0",
        // Cause mssql / tedious sends bigint as strings
        positive_bigint: positiveBigint.toString(10),
        negative_bigint: negativeBigint.toString(10),
        null_column: null,
        decimal_18_3: 1.001,
        // sqlserver will return the date as js date with T00:00:00.000Z
        iso_date: new Date(
          `${anIsoDate.toISOString().split("T")[0]}T00:00:00.000Z`
        ),
      });
    });
  });
  describe("ToTable", () => {
    it("should append the mssql query results into duckdb", async () => {
      const query = mssqlDs.queryBuilder
        .selectFrom("TestTable as t")
        .select([
          "t.id",
          "t.name",
          "t.positive_bigint",
          "negative_bigint",
          "null_column",
          "decimal_18_3",
          "iso_date",
        ]);

      const rowStream = mssqlDs.stream(query, {
        chunkSize: 1000,
      });

      const dbName = "memory_db";
      const testTable = new Table({
        name: "test_table",
        database: dbName,
      });

      // Arrange
      await duckConn.run(`ATTACH ':memory:' AS ${dbName} (COMPRESS 'true')`);

      const sqlDuck = new SqlDuck({
        conn: duckConn,
      });

      const testSchema = z.object({
        id: z.int32().meta({ primaryKey: true }),
        name: z.string(),
        positive_bigint: z.nullable(zodCodecs.bigintToString),
        negative_bigint: z.nullable(zodCodecs.bigintToString),
        null_column: z.nullable(z.number()),
        decimal_18_3: z.float32().meta({
          multipleOf: 0.001,
        }),
        iso_date: z.nullable(z.iso.date()),
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
        sqlt<mssqlE2eDb["TestTable"]>`select *from memory_db.test_table`
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toStrictEqual(
        mssqlE2eData.map((row) => {
          return {
            ...row,
            negative_bigint: negativeBigint.toString(10),
            positive_bigint: positiveBigint.toString(10),
            null_column: null,
            iso_date: anIsoDate.toISOString().split("T")[0],
            decimal_18_3: `${row.id + 1}.${((row.id + 1) % 1000).toString(10).padStart(3, "0")}`,
          };
        })
      );
    });
  });
});
