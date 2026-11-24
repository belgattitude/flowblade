import * as z from "zod";

import { zodCodecs } from "../../src/utils/zod-codecs.ts";
import type { InferZodRelaxedDataSchema } from "../../src/validation/zod/index.ts";
import { testFullSupportedColumnsZodSchema } from "./test-full-supported-columns-zod-schema.ts";

/**
 * The full set of supported columns: the base schema plus the types it
 * doesn't cover (unsigned and 128 bits integers, TIMESTAMP, decimals,
 * collations, nullable and typed lists).
 */
export const loaderFullSupportedSchema =
  testFullSupportedColumnsZodSchema.extend({
    js_number_utinyint: z.number().int().min(0).max(255),
    js_number_smallint: z.number().int().min(-32_768).max(32_767),
    js_number_usmallint: z.number().int().min(0).max(65_535),
    js_number_uint32: z.number().int().min(0).max(4_294_967_295),
    hugeint: zodCodecs.bigintToString.meta({ duckdbType: "HUGEINT" }),
    ubigint: zodCodecs.bigintToString.meta({ duckdbType: "UBIGINT" }),
    ts: z.nullable(z.string().meta({ duckdbType: "TIMESTAMP" })),
    decimal_10_2: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
    decimal_38_10: z.nullable(
      z.number().meta({ duckdbType: "DECIMAL(38,10)" })
    ),
    name_nocase: z.string().meta({ duckdbCollate: "NOCASE" }),
    nullable_list_of_strings: z.nullable(z.array(z.string())),
    list_of_uuids: z.array(z.uuid()),
    list_of_dates: z.array(z.iso.date()),
    list_of_timestamps: z.array(z.string()).meta({ duckdbType: "TIMESTAMP[]" }),
    list_of_ubigints: z.array(zodCodecs.bigintToString).meta({
      duckdbType: "UBIGINT[]",
    }),
  });

export type LoaderFullSupportedRow = InferZodRelaxedDataSchema<
  typeof loaderFullSupportedSchema
>;

const baseMs = Date.UTC(2025, 0, 1);
const dayMs = 86_400_000;
const enumValues = ["a", "b", "c"] as const;
const listEnumValues = ["a", "b"] as const;

/** Cycle through the values of a non empty list. */
const pick = <T>(values: readonly [T, ...T[]], i: number): T =>
  values[i % values.length] as T;

const hex12 = (n: number) => n.toString(16).padStart(12, "0");
// Version 7 / variant 8 uuids
const uuid = (n: number) => `019d2155-d292-71fa-87d7-${hex12(n)}`;
const isoDay = (n: number) =>
  new Date(baseMs + (n % 365) * dayMs).toISOString().slice(0, 10);
/** A list of 0 to 3 items, the length cycles with the row index. */
const list = <T>(i: number, item: (k: number) => T): T[] =>
  Array.from({ length: i % 4 }, (_, k) => item(k));

const maxHugeint = 2n ** 127n - 1n;

const genericRow = (i: number): LoaderFullSupportedRow => {
  return {
    id: i,
    name: i % 7 === 0 ? `näme-${i}-😀` : `name-${i}`,
    email: i % 3 === 0 ? null : `user${i}@example.com`,
    js_number: i * 1_000_003,
    js_number_tinyint: (i % 256) - 128,
    js_number_int32: i * 7 - 10_000,
    js_float_float64: i + 0.5,
    js_float_float32: (i % 100) + 0.25,
    bignumber: i % 4 === 0 ? null : BigInt(i) * 1_000_000_007n,
    created_at: new Date(baseMs + i * 61_000 + (i % 1000)),
    is_active: i % 3 === 0 ? null : i % 2 === 0,
    alt_uuid_v7: uuid(i),
    custom_type: uuid(i + 1),
    custom_date_only_type: isoDay(i),
    iso_date: isoDay(i + 1),
    js_enum: pick(enumValues, i),
    decimal_18_3: ((i * 37) % 100_000) / 1000,
    list_of_strings_explicit: list(i, (k) => `explicit-${i}-${k}`),
    list_of_strings: list(i, (k) => `item ${k} of ${i}`),
    list_of_enums: list(i, (k) => pick(listEnumValues, i + k)),
    list_of_bigints: list(i, (k) =>
      String(BigInt(i) * 3_000_000_000n + BigInt(k))
    ),
    list_of_bigints_explicit: list(i, (k) => String(-BigInt(i) - BigInt(k))),
    list_of_numbers: list(i, (k) => i * 10 + k),
    list_of_int32s: list(i, (k) => i - k * 100),
    list_of_booleans: list(i, (k) => (i + k) % 2 === 0),
    list_of_float32s: list(i, (k) => k + 0.5),
    list_of_float64s: list(i, (k) => i * 1.5 + k),
    js_number_utinyint: i % 256,
    js_number_smallint: (i % 65_536) - 32_768,
    js_number_usmallint: i % 65_536,
    js_number_uint32: i * 1000,
    hugeint: BigInt(i) * 10n ** 25n * (i % 2 === 0 ? 1n : -1n),
    ubigint: BigInt(i) * 4_000_000_000_000n,
    ts: i % 5 === 0 ? null : new Date(baseMs + i * 3_600_123).toISOString(),
    decimal_10_2: ((i * 101) % 1_000_000) / 100,
    decimal_38_10: i % 6 === 0 ? null : i + 0.25,
    name_nocase: i % 2 === 0 ? `Name-${i}` : `NAME-${i}`,
    nullable_list_of_strings: i % 3 === 0 ? null : list(i, (k) => `n${k}`),
    list_of_uuids: list(i, (k) => uuid(i * 10 + k)),
    list_of_dates: list(i, (k) => isoDay(i + k)),
    list_of_timestamps: list(i, (k) =>
      new Date(baseMs + (i + k) * 1000).toISOString()
    ),
    list_of_ubigints: list(i, (k) =>
      String(BigInt(i) * 5_000_000_000n + BigInt(k))
    ),
  };
};

/**
 * Row 0: lowest values, epoch and empty lists.
 */
const minRow = (): LoaderFullSupportedRow => {
  return {
    ...genericRow(0),
    name: `He said "hi", it's 'quoted'\n; DROP TABLE x; --`,
    email: null,
    js_number: Number.MIN_SAFE_INTEGER,
    js_number_tinyint: -128,
    js_number_int32: -2_147_483_648,
    js_float_float64: -1e300,
    js_float_float32: -16_777_216,
    bignumber: -9_223_372_036_854_775_808n,
    created_at: new Date(0),
    is_active: false,
    alt_uuid_v7: "00000000-0000-7000-8000-000000000000",
    custom_type: "00000000-0000-0000-0000-000000000000",
    custom_date_only_type: "1970-01-01",
    iso_date: "1970-01-01",
    js_enum: "a",
    decimal_18_3: -1_234_567.891,
    list_of_strings_explicit: [],
    list_of_strings: [],
    list_of_enums: [],
    list_of_bigints: [],
    list_of_bigints_explicit: [],
    list_of_numbers: [],
    list_of_int32s: [],
    list_of_booleans: [],
    list_of_float32s: [],
    list_of_float64s: [],
    js_number_utinyint: 0,
    js_number_smallint: -32_768,
    js_number_usmallint: 0,
    js_number_uint32: 0,
    hugeint: -maxHugeint,
    ubigint: 0n,
    ts: "1970-01-01T00:00:00.000Z",
    decimal_10_2: -99_999_999.99,
    decimal_38_10: null,
    name_nocase: "",
    nullable_list_of_strings: [],
    list_of_uuids: [],
    list_of_dates: [],
    list_of_timestamps: [],
    list_of_ubigints: [],
  };
};

/**
 * Row 1: highest values and filled lists.
 */
const maxRow = (): LoaderFullSupportedRow => {
  return {
    ...genericRow(1),
    js_number: Number.MAX_SAFE_INTEGER,
    js_number_tinyint: 127,
    js_number_int32: 2_147_483_647,
    js_float_float64: 1e300,
    js_float_float32: 16_777_216,
    bignumber: 9_223_372_036_854_775_807n,
    created_at: new Date("9999-12-31T23:59:59.999Z"),
    is_active: true,
    alt_uuid_v7: "ffffffff-ffff-7fff-bfff-ffffffffffff",
    custom_type: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    custom_date_only_type: "9999-12-31",
    iso_date: "2262-04-11",
    js_enum: "c",
    decimal_18_3: 1_234_567.891,
    list_of_strings_explicit: ["a", "b", "c"],
    list_of_strings: ["", "é", "😀"],
    list_of_enums: ["a", "b", "a"],
    list_of_bigints: ["9223372036854775807", "-1", "0"],
    list_of_bigints_explicit: ["-9223372036854775808", "1", "2"],
    list_of_numbers: [Number.MAX_SAFE_INTEGER, 0, Number.MIN_SAFE_INTEGER],
    list_of_int32s: [2_147_483_647, 0, -2_147_483_648],
    list_of_booleans: [true, false, true],
    list_of_float32s: [0.5, -0.5, 16_777_216],
    list_of_float64s: [1e300, -1e300, 0.1],
    js_number_utinyint: 255,
    js_number_smallint: 32_767,
    js_number_usmallint: 65_535,
    js_number_uint32: 4_294_967_295,
    hugeint: maxHugeint,
    ubigint: 18_446_744_073_709_551_615n,
    ts: "2025-12-31T23:59:59.999Z",
    decimal_10_2: 99_999_999.99,
    decimal_38_10: 1234.5,
    name_nocase: "ÀÉÎ",
    nullable_list_of_strings: ["x", "y", "z"],
    list_of_uuids: [
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "00000000-0000-0000-0000-000000000000",
      "019d2155-d292-71fa-87d7-9d1f1ed83569",
    ],
    list_of_dates: ["1970-01-01", "2025-06-15", "2262-04-11"],
    list_of_timestamps: [
      "1970-01-01T00:00:00.000Z",
      "2025-01-02T03:04:05.678Z",
      "2025-12-31T23:59:59.999Z",
    ],
    list_of_ubigints: ["0", "1", "18446744073709551615"],
  };
};

/**
 * Row 2: every nullable column is null.
 */
const nullRow = (): LoaderFullSupportedRow => {
  return {
    ...genericRow(2),
    email: null,
    bignumber: null,
    is_active: null,
    ts: null,
    decimal_38_10: null,
    nullable_list_of_strings: null,
  };
};

/**
 * Deterministic row of the full supported schema. The rows 0, 1 and 2 are
 * edge cases (lowest values, highest values, nulls), the others cycle
 * through values (nulls, list lengths from 0 to 3, unicode...).
 *
 * @example
 * ```typescript
 * const rows = Array.from({ length: 100 }, (_, i) => createFullSupportedRow(i));
 * ```
 */
export const createFullSupportedRow = (i: number): LoaderFullSupportedRow => {
  switch (i) {
    case 0: {
      return minRow();
    }
    case 1: {
      return maxRow();
    }
    case 2: {
      return nullRow();
    }
    default: {
      return genericRow(i);
    }
  }
};

/**
 * Stream `count` deterministic rows of the full supported schema, see
 * `createFullSupportedRow`.
 *
 * @yields A row of the full supported schema.
 */
export function* createFullSupportedRows(
  count: number
): Generator<LoaderFullSupportedRow> {
  for (let i = 0; i < count; i++) {
    yield createFullSupportedRow(i);
  }
}
