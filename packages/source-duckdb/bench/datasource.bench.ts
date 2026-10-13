import { DuckDBInstance } from "@duckdb/node-api";
import { expect, test } from "vitest";

import { DuckdbDatasource, sql } from "../src/index.ts";

test("DuckdbDatasource: raw vs query vs stream", async ({
  bench,
  onTestFinished,
}) => {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  onTestFinished(() => {
    connection.closeSync();
    instance.closeSync();
  });
  const ds = new DuckdbDatasource({ connection });

  const rowCount = 10_000;
  const query = sql<{
    id: number;
    name: string;
  }>`SELECT range::INTEGER as id, 'name-' || range as name FROM range(${rowCount})`;

  // Consume the results, the engine might eliminate unused code
  let rows = 0;

  await bench.compare(
    bench("duckdb runAndReadAll + getRowObjectsJson (baseline)", async () => {
      const reader = await connection.runAndReadAll(query.text, [rowCount]);
      rows += reader.getRowObjectsJson().length;
    }),
    bench("DuckdbDatasource.query", async () => {
      const { data } = await ds.queryOrThrow(query);
      rows += data.length;
    }),
    bench("DuckdbDatasource.stream", async () => {
      for await (const _row of ds.stream(query)) {
        rows++;
      }
    }),
    { time: 1000 }
  );

  expect(rows).toBeGreaterThan(0);
});
