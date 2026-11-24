/**
 * Compare the load strategies of `DuckTableLoader` (see docs/loader.md,
 * "Choosing a strategy") on the same rows, for two profiles:
 *
 * - 5 columns: integer, varchar, nullable varchar, bigint, timestamp
 * - the full supported schema (42 columns: lists, enums, decimals, uuids...),
 *   with fewer rows
 *
 * The strategies come from `loadStrategies` (tests/utils/load-strategies.ts),
 * a strategy added there is benchmarked automatically. Each one runs with its
 * default options, which is what users get (ie: `PreparedInsertStrategy` defaults
 * to a `chunkSize` of 256, multi-row inserts are much slower with 2048).
 *
 * ```bash
 * pnpm bench bench/loader-strategies.bench.ts
 * ```
 */
import path from "node:path";

import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";
import isInCi from "is-in-ci";
import { type BenchCompareOptions, type TestContext, test } from "vitest";
import * as z from "zod";

import {
  createFullSupportedRows,
  loaderFullSupportedSchema,
} from "#tests/data/loader-full-supported-dataset.ts";
import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";
import {
  loadStrategies,
  strategyTableName,
} from "#tests/utils/load-strategies.ts";

import { DuckTableLoader } from "../src/loader/index.ts";
import type { RowStream } from "../src/loader/index.ts";
import { Table } from "../src/objects/table.ts";
import { zodCodecs } from "../src/utils/zod-codecs.ts";
import type {
  InferZodRelaxedDataSchema,
  TableSchemaZod,
} from "../src/validation/zod/index.ts";

// Bench functions must be declared `async`: tinybench calls a non-async
// function once when it is registered (without awaiting it) to detect
// whether it returns a promise, which would start an extra load.
const benchConfig: BenchCompareOptions = {
  iterations: isInCi ? 1 : 5,
  warmupIterations: 1,
  throws: true,
};

// PreparedInsertStrategy is ~15x slower than the chunk appenders
const limit = isInCi ? 10_000 : 100_000;
// 42 columns instead of 5, fewer rows to keep the slowest strategies in check
const fullLimit = isInCi ? 5000 : 20_000;
const testTimeout = 300_000;

const smallSchema = z.object({
  id: z.int32(),
  name: z.string(),
  email: z.string().nullable(),
  bignumber: z.nullable(zodCodecs.bigintToString),
  created_at: z.string().meta({ duckdbType: "TIMESTAMP" }),
});

const createdAt = "2025-12-16T00:00:00.000Z";

function* getSmallRows(): Generator<
  InferZodRelaxedDataSchema<typeof smallSchema>
> {
  for (let id = 0; id < limit; id++) {
    yield {
      id,
      name: `name-${id % 20}`,
      email: id % 3 === 0 ? null : `user-${id % 20}@example.com`,
      bignumber: BigInt(id),
      created_at: createdAt,
    };
  }
}

const openConnection = async (onTestFinished: (fn: () => void) => void) => {
  const instance = await DuckDBInstance.create(":memory:", {
    threads: isInCi ? "1" : "4",
    max_memory: isInCi ? "256MB" : "2GB",
    temp_directory: path.join(testTempDir, "duckdb-temp"),
  });
  const conn = await instance.connect();
  onTestFinished(() => {
    conn.closeSync();
    instance.closeSync();
  });
  return conn;
};

/**
 * Compare every strategy loading the same rows, each in its own table.
 */
const compareStrategies = async <TSchema extends TableSchemaZod>(params: {
  bench: TestContext["bench"];
  conn: DuckDBConnection;
  tablePrefix: string;
  count: number;
  schema: TSchema;
  getRows: () => RowStream<InferZodRelaxedDataSchema<TSchema>>;
}) => {
  const { bench, conn, tablePrefix, count, schema, getRows } = params;
  await bench.compare(
    ...loadStrategies.map(([name, createStrategy]) => {
      const table = new Table(strategyTableName(tablePrefix, name));
      return bench(name, async () => {
        const { totalRows } = await new DuckTableLoader({
          conn,
          strategy: createStrategy(),
        }).load({
          table,
          schema,
          rows: getRows(),
          mode: "createOrReplace",
        });
        if (totalRows !== count) {
          throw new Error(`Expected ${count} rows, got ${totalRows} rows`);
        }
      });
    }),
    benchConfig
  );
};

test(
  `loader strategies: 5 columns, memory (count: ${limit})`,
  async ({ bench, onTestFinished }) => {
    await compareStrategies({
      bench,
      conn: await openConnection(onTestFinished),
      tablePrefix: "bench_small",
      count: limit,
      schema: smallSchema,
      getRows: getSmallRows,
    });
  },
  testTimeout
);

test(
  `loader strategies: full supported schema, memory (count: ${fullLimit})`,
  async ({ bench, onTestFinished }) => {
    await compareStrategies({
      bench,
      conn: await openConnection(onTestFinished),
      tablePrefix: "bench_full",
      count: fullLimit,
      schema: loaderFullSupportedSchema,
      getRows: () => createFullSupportedRows(fullLimit),
    });
  },
  testTimeout
);
