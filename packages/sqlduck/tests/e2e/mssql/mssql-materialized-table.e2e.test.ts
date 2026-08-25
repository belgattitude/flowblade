import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource } from "@flowblade/source-duckdb";
import type { KyselyDatasource } from "@flowblade/source-kysely";
import { sql as sqlt } from "@flowblade/sql-tag";
import { MSSQLServerContainer } from "@testcontainers/mssqlserver";
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver/build/mssqlserver-container";
import isInCi from "is-in-ci";
import { sql } from "kysely";
import { describe } from "vitest";
import * as z from "zod";

import { createDuckdbTestMemoryDb } from "#/tests/utils/create-duckdb-test-memory-db.ts";
import { createDummyKyselyDb } from "#/tests/utils/create-dummy-kysely-db.ts";

import { SqlDuck, Table, zodCodecs } from "../../../src";
import { withMaterializedKyselyQuery } from "../../../src/integrations/kysely";
import { KyselyMaterializableTable } from "../../../src/integrations/kysely/kysely-materializable-table.ts";
import { createContainerMssql } from "../create-container-mssql";
import {
  anIsoDate,
  getMssqlE2eMigrations,
  mssqlE2eData,
  type mssqlE2eDb,
  negativeBigint,
  positiveBigint,
  testDataCount,
} from "./get-mssql-e2e-migrations.ts";

const mssqlImage = "mcr.microsoft.com/mssql/server:2025-latest";
const startupTimeout = isInCi ? 300_000 : 60_000;

const testTimeout = 10_000;

describe("MSSQL materialized e2e tests", () => {
  let container: StartedMSSQLServerContainer;
  let mssqlDs: KyselyDatasource<mssqlE2eDb>;
  let duckConn: DuckDBConnection;

  beforeAll(async () => {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    mssqlDs = createContainerMssql(container);
    await getMssqlE2eMigrations(mssqlDs).up();

    duckConn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? "128M" : "256M",
      threads: 1,
    });
  }, startupTimeout);

  afterAll(async () => {
    await getMssqlE2eMigrations(mssqlDs).down();
    await mssqlDs.getConnection().destroy();
    await container.stop();
    if (duckConn) {
      duckConn.closeSync();
    }
  });

  describe("Materialized duckdb test", () => {
    it(
      "should work",
      async () => {
        const query = mssqlDs.queryBuilder.selectFrom("TestTable as t").select([
          "t.id",
          "t.name",
          "t.positive_bigint",
          "t.negative_bigint",
          "t.null_column",
          "t.decimal_18_3",
          //"t.iso_date",
        ]);

        const table = new KyselyMaterializableTable({
          sourceQuery: query,
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
          table,
        });
        expect(result.meta.create.rows).toStrictEqual(testDataCount);
      },
      testTimeout
    );
  });
});
