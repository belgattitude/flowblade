# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.3`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender, count: 100000, chunk size 1024 | 56.89 ms | 45.22 ms | +25.81% | 17.59 ops/s | 22.13 ops/s | +25.81% |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.95 ms | 45.51 ms | +25.15% | 17.57 ops/s | 21.99 ops/s | +25.15% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.39 ms | 49.92 ms | +26.99% | 15.78 ops/s | 20.04 ops/s | +26.94% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 63.88 ms | 49.9 ms | +28.01% | 15.68 ops/s | 20.05 ops/s | +27.85% |
| duckdb appender file, count: 100000, chunk size 2048 | 68.58 ms | 54.12 ms | +26.71% | 14.59 ops/s | 18.49 ops/s | +26.71% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.55 ms | 1.35 ms | +163.79% | 282.1 ops/s | 745.03 ops/s | +164.1% |
| from Date | 4.33 ms | 1.74 ms | +148.3% | 231.19 ops/s | 574.62 ops/s | +148.55% |
| from number | 4.36 ms | 1.7 ms | +156.22% | 229.81 ops/s | 589.15 ops/s | +156.37% |
| from date string | 6.49 ms | 4.51 ms | +44.02% | 154.18 ops/s | 222 ops/s | +43.99% |
| from ISO string | 7.96 ms | 6.8 ms | +17.12% | 125.73 ops/s | 147.17 ops/s | +17.06% |
| from SQL string | 8.62 ms | 6.46 ms | +33.44% | 116.14 ops/s | 154.94 ops/s | +33.4% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.66 ms | 1.65 ms | +121.96% | 273.03 ops/s | 606.76 ops/s | +122.23% |
| from date string | 5.78 ms | 4.36 ms | +32.53% | 173.21 ops/s | 229.5 ops/s | +32.5% |
| from ISO string | 5.81 ms | 4.4 ms | +32.3% | 172.08 ops/s | 227.76 ops/s | +32.36% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 520.79 us | 229.2 us | +127.22% | 1,926.62 ops/s | 4,371.32 ops/s | +126.89% |
| from number | 1.34 ms | 642.45 us | +107.85% | 749.49 ops/s | 1,562.98 ops/s | +108.54% |
| from string | 3.14 ms | 2.66 ms | +18.09% | 319.09 ops/s | 377.01 ops/s | +18.15% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 513.32 us | 250.12 us | +105.23% | 1,950.76 ops/s | 4,005.77 ops/s | +105.34% |
| toDecimal(18,3) from number | 4.32 ms | 2.08 ms | +107.8% | 231.48 ops/s | 481.51 ops/s | +108.02% |
| toUUID from string | 12.34 ms | 9.97 ms | +23.81% | 81.05 ops/s | 100.52 ops/s | +24.02% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.43 ms | 11.44 ms | +113.55% | 40.97 ops/s | 87.48 ops/s | +113.55% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.53 ms | 13.53 ms | +88.62% | 39.2 ops/s | 74.22 ops/s | +89.33% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.73 ms | 15.9 ms | +105.94% | 30.56 ops/s | 63.01 ops/s | +106.17% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 103.45 ms | 71.48 ms | +44.73% | 9.67 ops/s | 14 ops/s | +44.77% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 164.72 ms | 112.37 ms | +46.59% | 6.07 ops/s | 8.92 ops/s | +46.84% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 191.16 ms | 104.43 ms | +83.06% | 5.25 ops/s | 9.58 ops/s | +82.26% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 198.25 ms | 134.25 ms | +47.67% | 5.04 ops/s | 7.45 ops/s | +47.69% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 31.9 ms | 38.02 ms | -16.1% | 31.36 ops/s | 26.32 ops/s | -16.06% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 32.48 ms | 36.1 ms | -10.02% | 30.8 ops/s | 27.75 ops/s | -9.92% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.68 us | 8.38 us | +87.03% | 64,402.99 ops/s | 128,232.62 ops/s | +99.11% |
