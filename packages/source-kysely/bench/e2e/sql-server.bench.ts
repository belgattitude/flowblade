import { expect, inject, test } from "vitest";

import { createMssqlDatasource } from "../../tests/e2e/mssql/create-mssql-datasource.ts";
import type { mssqlE2eDb } from "../../tests/e2e/mssql/get-mssql-e2e-migrations.ts";

test("SQL Server: query vs stream", async ({ bench, onTestFinished }) => {
  // The container is started and seeded once in tests/e2e/mssql/global-setup.ts
  const ds = createMssqlDatasource<mssqlE2eDb>(inject("mssql"));
  onTestFinished(() => ds.getConnection().destroy());

  const query = ds.queryBuilder
    .selectFrom("TestTable")
    .select(["id", "name", "positive_bigint", "negative_bigint", "created_at"]);

  // Consume the results, the engine might eliminate unused code
  let rowCount = 0;

  await bench.compare(
    bench("KyselyDatasource.query", async () => {
      const { data } = await ds.queryOrThrow(query);
      rowCount += data.length;
    }),
    bench("KyselyDatasource.stream", async () => {
      for await (const _row of ds.stream(query)) {
        rowCount++;
      }
    }),
    { time: 1000 }
  );

  expect(rowCount).toBeGreaterThan(0);
});
