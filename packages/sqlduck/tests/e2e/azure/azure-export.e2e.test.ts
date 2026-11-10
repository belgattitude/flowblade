import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";

import { QueryExporter } from "../../../src/export/index.ts";
import { DuckSecretsManager } from "../../../src/index.ts";

// Created in ./global-setup.ts
const container = "exports";

describe("Azure Blob Storage export e2e tests", () => {
  let conn: DuckDBConnection;
  let datasource: DuckdbDatasource;
  let exporter: QueryExporter;
  let secrets: DuckSecretsManager;

  const listBlobs = async (prefix: string): Promise<string[]> => {
    const { data } = await datasource.queryOrThrow<{ file: string }[]>(
      sql`SELECT file FROM glob(${`az://${container}/${prefix}/**`}) ORDER BY file`
    );
    return data.map(({ file }) => file);
  };

  beforeAll(async () => {
    // The emulator is started once in ./global-setup.ts
    const { connectionString } = inject("azurite");
    const duckDb = await openDuckdbTestMemoryDb({
      max_memory: "256M",
      threads: 1,
    });
    ({ conn } = duckDb);
    datasource = new DuckdbDatasource({ connection: conn });
    exporter = new QueryExporter({ datasource });
    secrets = new DuckSecretsManager(conn);
    await secrets.create({
      name: "exports_azurite",
      type: "azure",
      connectionString,
      scope: `az://${container}/`,
    });

    return () => {
      duckDb.close();
    };
  }, 60_000);

  it("exports Parquet to a blob that DuckDB can read back", async () => {
    const url = `az://${container}/parquet/users.parquet`;
    const exported = await exporter.toObjectStorage({
      sql: sql`SELECT range AS id, ${"user-"} || range AS name FROM range(1000)`,
      format: { type: "parquet", compression: "zstd" },
      url,
    });

    expect(exported).toStrictEqual({
      url,
      contentType: "application/vnd.apache.parquet",
      rowCount: 1000,
      timeMs: expect.any(Number),
    });
    const { data } = await datasource.queryOrThrow(
      sql`SELECT count(*)::INTEGER AS total, max(name) AS last FROM read_parquet(${url})`
    );
    expect(data).toStrictEqual([{ total: 1000, last: "user-999" }]);
  });

  it("exports CSV with mapQuery and selectColumns, and replaces an existing blob", async () => {
    const url = `az://${container}/csv/users.csv`;
    const params = {
      format: { type: "csv", header: true },
      url,
      mapQuery: (query) =>
        sql`SELECT *, upper(name) AS name_uc FROM (${query}) ORDER BY id`,
      selectColumns: { id: "User ID", name_uc: "Name" },
    } satisfies Partial<Parameters<QueryExporter["toObjectStorage"]>[0]>;

    await exporter.toObjectStorage({
      ...params,
      sql: sql`SELECT * FROM (VALUES (1, 'previous')) AS t(id, name)`,
    });
    await exporter.toObjectStorage({
      ...params,
      sql: sql`SELECT * FROM (VALUES (2, 'b'), (1, 'a')) AS t(id, name)`,
    });

    const { data } = await datasource.queryOrThrow(
      sql`SELECT "User ID"::INTEGER AS "User ID", "Name" FROM read_csv(${url})`
    );
    expect(data).toStrictEqual([
      { "User ID": 1, Name: "A" },
      { "User ID": 2, Name: "B" },
    ]);
    await expect(listBlobs("csv")).resolves.toStrictEqual([url]);
  });

  it("exports an Excel workbook to a blob", async () => {
    const url = `az://${container}/excel/answers.xlsx`;
    const exported = await exporter.toObjectStorage({
      sql: sql`SELECT ${42}::INTEGER AS answer`,
      format: { type: "excel", header: true },
      url,
    });

    expect(exported.rowCount).toBe(1);
    await expect(listBlobs("excel")).resolves.toStrictEqual([url]);
  });

  it("leaves no partial blob when the export fails midway", async () => {
    await expect(
      exporter.toObjectStorage({
        sql: sql`
          SELECT CASE WHEN range = 900000 THEN error('boom') ELSE range END AS id
          FROM range(1000000)`,
        format: { type: "csv" },
        url: `az://${container}/failed/partial.csv`,
      })
    ).rejects.toThrow("boom");

    await expect(listBlobs("failed")).resolves.toStrictEqual([]);
  });

  it("fails when no secret gives access to the container", async () => {
    await expect(
      exporter.toObjectStorage({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
        url: "az://unscoped/one.csv",
      })
    ).rejects.toThrow("No valid Azure credentials found");
  });

  it("exports with a temporary secret, dropped afterwards", async () => {
    const { connectionString } = inject("azurite");
    const url = `az://${container}/temporary/one.csv`;
    await secrets.drop("exports_azurite");
    try {
      const exported = await secrets.withSecret(
        { type: "azure", connectionString, scope: `az://${container}/` },
        async () =>
          await exporter.toObjectStorage({
            sql: sql`SELECT 1 AS one`,
            format: { type: "csv" },
            url,
          })
      );
      expect(exported.rowCount).toBe(1);
      await expect(secrets.list({ type: "azure" })).resolves.toStrictEqual([]);
    } finally {
      await secrets.create({
        name: "exports_azurite",
        type: "azure",
        connectionString,
        scope: `az://${container}/`,
      });
    }
    await expect(listBlobs("temporary")).resolves.toStrictEqual([url]);
  });
});
