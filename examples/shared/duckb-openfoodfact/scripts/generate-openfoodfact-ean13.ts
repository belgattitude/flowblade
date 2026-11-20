import fs from "node:fs";
import * as os from "node:os";

import { DuckDBInstance } from "@duckdb/node-api";
import boxen from "boxen";
import dedent from "dedent";
import prettyBytes from "pretty-bytes";
import pc from "tinyrainbow";

import { scriptsConfig } from "./config/scripts.config";
import { formatTimeMsToSeconds } from "./utils/formatter";

const { local: sourceParquet } = scriptsConfig.openfoodfact.foodData;
const {
  macrosSql: macrosFile,
  sql: sqlFile,
  local: outputParquet,
} = scriptsConfig.openfoodfact.foodEan13;

const escapeSqlString = (value: string) => value.replaceAll("'", "''");

// Step 1 sql: only macro definitions (openfoodfact-macros.sql)
const getMacrosSql = () => fs.readFileSync(macrosFile, "utf8");

// Step 2 sql: only the export query (food-ean13.sql), it relies on the macros from step 1
const getExportQuery = () => {
  const query = fs.readFileSync(sqlFile, "utf8");
  if (
    /\bcreate\s+(or\s+replace\s+)?(temp\s+|temporary\s+)?macro\b/i.test(query)
  ) {
    throw new Error(
      `${sqlFile} must not define macros, move them to ${macrosFile}`
    );
  }
  return query
    .replaceAll("{{source_parquet}}", escapeSqlString(sourceParquet))
    .replaceAll("{{output_parquet}}", escapeSqlString(outputParquet));
};

try {
  if (!fs.existsSync(sourceParquet)) {
    throw new Error(
      `Source parquet not found: ${sourceParquet}, run 'pnpm tsx ./scripts/download-openfoodfact-data.ts' first`
    );
  }

  const threads = `${os.availableParallelism() - 1}`;
  const memory = "4GB";
  console.log(
    pc.bold(
      boxen(
        dedent`
        DuckDb Instance (in-memory)
        👉 Macros: ${macrosFile}
        👉 Sql file: ${sqlFile}
        👉 Source: ${sourceParquet}
        👉 Output: ${outputParquet}
        👉 Memory: ${memory}
        👉 Threads: ${threads}
        `
      )
    )
  );

  const instance = await DuckDBInstance.create(":memory:", {
    max_memory: memory,
    threads,
  });
  const conn = await instance.connect();

  const start = performance.now();

  // 1. register the macros
  await conn.run(getMacrosSql());
  console.log(pc.dim(`✔ Macros registered from ${macrosFile}`));

  // 2. run the export query
  await conn.run(getExportQuery());
  console.log(pc.dim(`✔ Query executed from ${sqlFile}`));

  const elapsedMs = performance.now() - start;

  const reader = await conn.runAndReadAll(dedent`
    SELECT count(*)::INTEGER                 AS products,
           count_if(code_type = 'EAN-13')::INTEGER AS ean13,
           count_if(code_type = 'UPC-A')::INTEGER  AS upc_a,
           round(avg(quality_score), 1)::DOUBLE    AS avg_quality_score
    FROM read_parquet('${escapeSqlString(outputParquet)}')
  `);
  const [summary] = reader.getRowObjectsJson();
  conn.closeSync();
  instance.closeSync();

  console.log(
    boxen(
      pc.green(dedent`
        Exported ${outputParquet}
        👉 Products: ${summary?.products} (EAN-13: ${summary?.ean13}, UPC-A: ${summary?.upc_a})
        👉 Avg quality score: ${summary?.avg_quality_score}
        👉 Size: ${prettyBytes(fs.statSync(outputParquet).size)}
        👉 Time: ${formatTimeMsToSeconds(elapsedMs)} seconds
      `)
    )
  );
} catch (error) {
  console.log(boxen(pc.red((error as Error).message)));
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}
