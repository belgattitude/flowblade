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
| duckdb appender memory, count: 100000, chunk size 2048 | 59.78 ms | 47.67 ms | +25.4% | 16.73 ops/s | 20.98 ops/s | +25.41% |
| duckdb appender, count: 100000, chunk size 1024 | 59.95 ms | 50.98 ms | +17.6% | 16.68 ops/s | 19.65 ops/s | +17.77% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 64.71 ms | 53.06 ms | +21.96% | 15.45 ops/s | 18.85 ops/s | +21.96% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 65.12 ms | 55.67 ms | +16.97% | 15.36 ops/s | 17.99 ops/s | +17.16% |
| duckdb appender file, count: 100000, chunk size 2048 | 69.21 ms | 57.05 ms | +21.32% | 14.45 ops/s | 17.53 ops/s | +21.32% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.81 ms | 1.36 ms | +180.85% | 262.78 ops/s | 738.71 ops/s | +181.12% |
| from Date | 4.16 ms | 1.87 ms | +122.69% | 240.73 ops/s | 536.05 ops/s | +122.67% |
| from number | 4.73 ms | 1.72 ms | +174.69% | 211.68 ops/s | 581.92 ops/s | +174.91% |
| from date string | 6.32 ms | 4.52 ms | +40.04% | 158.13 ops/s | 221.57 ops/s | +40.12% |
| from ISO string | 7.77 ms | 6.75 ms | +15.04% | 128.78 ops/s | 148.17 ops/s | +15.05% |
| from SQL string | 8.31 ms | 6.36 ms | +30.66% | 120.3 ops/s | 157.2 ops/s | +30.67% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.61 ms | 1.65 ms | +119.01% | 277.22 ops/s | 607.42 ops/s | +119.11% |
| from date string | 5.54 ms | 4.27 ms | +29.83% | 180.58 ops/s | 234.48 ops/s | +29.85% |
| from ISO string | 5.57 ms | 4.29 ms | +29.8% | 179.61 ops/s | 233.16 ops/s | +29.82% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 506.39 us | 224.87 us | +125.19% | 1,976.95 ops/s | 4,451.51 ops/s | +125.17% |
| from number | 1.34 ms | 630.43 us | +112.76% | 746.13 ops/s | 1,592.24 ops/s | +113.4% |
| from string | 3.09 ms | 2.56 ms | +20.92% | 323.24 ops/s | 391.03 ops/s | +20.97% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 512.78 us | 243.23 us | +110.82% | 1,952.5 ops/s | 4,114.86 ops/s | +110.75% |
| toDecimal(18,3) from number | 4.33 ms | 2.09 ms | +107.64% | 230.87 ops/s | 479.68 ops/s | +107.77% |
| toUUID from string | 7.18 ms | 6.22 ms | +15.44% | 139.28 ops/s | 161.4 ops/s | +15.89% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.24 ms | 11.5 ms | +102.16% | 43.04 ops/s | 87.11 ops/s | +102.39% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.27 ms | 12.79 ms | +89.71% | 41.22 ops/s | 78.3 ops/s | +89.94% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.52 ms | 15.63 ms | +101.64% | 31.74 ops/s | 64 ops/s | +101.64% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 97.07 ms | 49.02 ms | +98.05% | 10.3 ops/s | 20.4 ops/s | +98.02% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 152.35 ms | 83.42 ms | +82.62% | 6.57 ops/s | 11.99 ops/s | +82.6% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 167.14 ms | 91.33 ms | +83.02% | 5.98 ops/s | 10.95 ops/s | +83% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 31.01 ms | 23.09 ms | +34.32% | 32.28 ops/s | 43.34 ops/s | +34.25% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 31.71 ms | 21.48 ms | +47.65% | 31.55 ops/s | 46.58 ops/s | +47.67% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.75 us | 8.43 us | +86.91% | 64,121.05 ops/s | 125,112.02 ops/s | +95.12% |
