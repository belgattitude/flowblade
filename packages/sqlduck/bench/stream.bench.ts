import isInCi from "is-in-ci";
import { test } from "vitest";
import type { BenchCompareOptions } from "vitest";
import * as z from "zod";

import { testFullSupportedColumnsZodSchema } from "#/tests/data/test-full-supported-columns-zod-schema.ts";

import { createDuckColumnConverters } from "../src/converter/create-duck-column-converters.ts";
import { Table } from "../src/objects/table.ts";
import { getTableCreateFromZod } from "../src/table/get-table-create-from-zod.ts";
import { rowsToColumnsChunks } from "../src/utils/rows-to-columns-chunks";
import { createFakeRowsAsyncIterator } from "../tests/utils/create-fake-rows-iterator";

const benchConfig: BenchCompareOptions = {
  iterations: isInCi ? 1 : 10,
  warmupIterations: isInCi ? 1 : 1,
  throws: true,
};

test(`Bench rowsToColumnsChunks`, async ({ bench }) => {
  const userSchema = z.object({
    id: z.number().meta({ description: "cool" }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(z.bigint()),
  });

  const limit = isInCi ? 1000 : 100_000;

  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: userSchema,
    factory: ({ rowIdx }) => {
      return {
        id: 0,
        name: `name-${rowIdx}`,
        email: `email-${rowIdx}@example.com`.repeat(10),
        bignumber: 0n,
      };
    },
  });

  async function* mapFakeRowStream(
    stream: ReturnType<typeof getFakeRowStream>
  ): AsyncIterableIterator<z.input<typeof userSchema>> {
    for await (const row of stream) {
      yield {
        ...row,
        bignumber: 1n,
      };
    }
  }

  await bench.compare(
    bench(`rowToColumnsChunk with chunkSize 2048 (count: ${limit})`, async () => {
      const chunkSize = 2048;
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
      });
      for await (const row of a) {
        const _a = row;
      }
    }),
    bench(`rowToColumnsChunk with transformer with chunkSize 2048 (count: ${limit})`, async () => {
      const chunkSize = 2048;
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
        transformers: {
          bignumber: (value: bigint) => {
            return (value + 1n).toString(10);
          },
        },
      });
      for await (const row of a) {
        const _a = row;
      }
    }),
    bench(`mapFakeRowStream with chunkSize 2048 (count: ${limit})`, async () => {
      const a = rowsToColumnsChunks({
        rows: mapFakeRowStream(getFakeRowStream()),
        chunkSize: 2048,
      });
      for await (const row of a) {
        const _a = row;
      }
    }),
    benchConfig
  );
});

test(`Bench rowsToColumnsChunks with full supported-columns schema`, async ({
  bench,
}) => {
  const limit = isInCi ? 1000 : 100_000;
  const chunkSize = 2048;

  // Real DuckDB column types for the full schema, derived the same way
  // `toTable` does, so the transformers below exercise the exact converter
  // mix (BIGINT, TIMESTAMP_MS, UUID, ENUM, DATE, DECIMAL, LIST) a real
  // `toTable` call would build via `createDuckColumnConverters` — enough
  // distinct converter functions per row for V8 call-site polymorphism to
  // actually kick in, unlike the single-bigint-transformer bench above.
  const { columnTypes } = getTableCreateFromZod({
    table: new Table("bench_full_schema"),
    schema: testFullSupportedColumnsZodSchema,
  });
  type FullSchemaRow = z.output<typeof testFullSupportedColumnsZodSchema>;
  const columnTypeIds = {} as Record<
    keyof FullSchemaRow,
    typeof columnTypes extends Map<unknown, infer V> ? V : never
  >;
  for (const [key, duckType] of columnTypes) {
    columnTypeIds[key as keyof FullSchemaRow] = duckType;
  }
  const transformers = createDuckColumnConverters(columnTypeIds);

  const now = new Date("2025-12-16T00:00:00.000Z");

  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: testFullSupportedColumnsZodSchema,
    factory: ({ rowIdx }) => ({
      id: rowIdx,
      name: `name-${rowIdx}`,
      email: `email-${rowIdx}@example.com`,
      js_number: rowIdx,
      js_number_tinyint: rowIdx % 127,
      js_number_int32: rowIdx,
      js_float_float64: rowIdx + 0.5,
      js_float_float32: rowIdx + 0.25,
      bignumber: BigInt(rowIdx),
      created_at: now,
      is_active: rowIdx % 2 === 0,
      alt_uuid_v7: "0198f9b0-6f4a-7c33-8f7a-8f2a9b6f1a10",
      custom_type: "0198f9b0-6f4a-7c33-8f7a-8f2a9b6f1a10",
      custom_date_only_type: "2025-12-16",
      iso_date: "2025-12-16",
      js_enum: "a" as const,
      decimal_18_3: rowIdx + 0.123,
      list_of_strings_explicit: ["a", "b", "c"],
      list_of_strings: ["a", "b", "c"],
      list_of_bigints: [BigInt(rowIdx), BigInt(rowIdx + 1)],
      list_of_bigints_explicit: [BigInt(rowIdx), BigInt(rowIdx + 1)],
      list_of_numbers: [1, 2, 3],
      list_of_int32s: [1, 2, 3],
      list_of_booleans: [true, false, true],
      list_of_float32s: [1.1, 2.2, 3.3],
      list_of_float64s: [1.1, 2.2, 3.3],
    }),
  });

  await bench.compare(
    bench(`full schema, no transformers, chunkSize 2048 (count: ${limit})`, async () => {
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
      });
      for await (const row of a) {
        const _a = row;
      }
    }),
    bench(`full schema, with all column converters, chunkSize 2048 (count: ${limit})`, async () => {
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
        transformers,
      });
      for await (const row of a) {
        const _a = row;
      }
    }),
    benchConfig
  );
});
