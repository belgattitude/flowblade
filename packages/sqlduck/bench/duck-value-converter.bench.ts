import isInCi from "is-in-ci";
import { type BenchCompareOptions, test } from "vitest";

import { DuckValueConverter } from "../src/converter/duck-value-converter.ts";

const benchConfig: BenchCompareOptions = {
  iterations: isInCi ? 1 : 10,
  warmupIterations: isInCi ? 1 : 2,
  throws: true,
};

const count = isInCi ? 10_000 : 100_000;

const converter = new DuckValueConverter();

const baseMs = Date.UTC(2025, 11, 16, 0, 0, 0);
const msInDay = 86_400_000;

const dates = Array.from(
  { length: count },
  (_, i) => new Date(baseMs + (i % 3650) * msInDay + (i % 86_400) * 1000)
);
const isoTimestamps = dates.map((d) => d.toISOString());
const sqlTimestamps = isoTimestamps.map((s) =>
  s.replace("T", " ").slice(0, 19)
);
const dateStrings = isoTimestamps.map((s) => s.slice(0, 10));
const epochNumbers = dates.map((d) => d.getTime());
const epochBigInts = epochNumbers.map(BigInt);
const bigintStrings = Array.from({ length: count }, (_, i) =>
  String(9_223_372_036_854_775_807n - BigInt(i))
);
const uuids = Array.from({ length: count }, (_, i) => {
  const hex = i.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
});
const decimalNumbers = Array.from({ length: count }, (_, i) => i * 1.123);

const run =
  <T>(values: T[], fn: (value: T) => unknown) =>
  () => {
    for (const value of values) {
      fn(value);
    }
  };

test(`DuckValueConverter.toTimestampMs, count: ${count}`, async ({ bench }) => {
  await bench.compare(
    bench("from Date", run(dates, converter.toTimestampMs)),
    bench("from ISO string", run(isoTimestamps, converter.toTimestampMs)),
    bench("from SQL string", run(sqlTimestamps, converter.toTimestampMs)),
    bench("from date string", run(dateStrings, converter.toTimestampMs)),
    bench("from number", run(epochNumbers, converter.toTimestampMs)),
    bench("from bigint", run(epochBigInts, converter.toTimestampMs)),
    benchConfig
  );
});

test(`DuckValueConverter.toDate, count: ${count}`, async ({ bench }) => {
  await bench.compare(
    bench("from Date", run(dates, converter.toDate)),
    bench("from date string", run(dateStrings, converter.toDate)),
    bench("from ISO string", run(isoTimestamps, converter.toDate)),
    benchConfig
  );
});

test(`DuckValueConverter.toBigInt, count: ${count}`, async ({ bench }) => {
  await bench.compare(
    bench("from bigint", run(epochBigInts, converter.toBigInt)),
    bench("from number", run(epochNumbers, converter.toBigInt)),
    bench("from string", run(bigintStrings, converter.toBigInt)),
    benchConfig
  );
});

test(`DuckValueConverter misc, count: ${count}`, async ({ bench }) => {
  const toDecimal = converter.createDecimalConverter(18, 3);
  await bench.compare(
    bench("toUUID from string", run(uuids, converter.toUUID)),
    bench("toDecimal(18,3) from number", run(decimalNumbers, toDecimal)),
    bench("toStringEnum from string", run(dateStrings, converter.toStringEnum)),
    benchConfig
  );
});
