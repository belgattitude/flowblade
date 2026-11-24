# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v26.13.1`                      |
| Bun         | `1.4.5`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender memory, count: 100000, chunk size 2048 | 55.31 ms | 43.52 ms | +27.1% | 18.08 ops/s | 22.98 ops/s | +27.1% |
| duckdb appender, count: 100000, chunk size 1024 | 56.04 ms | 46.56 ms | +20.38% | 17.85 ops/s | 21.53 ops/s | +20.6% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 58.8 ms | 46.81 ms | +25.62% | 17.01 ops/s | 21.36 ops/s | +25.58% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 59.18 ms | 51.1 ms | +15.83% | 16.91 ops/s | 19.8 ops/s | +17.1% |
| duckdb appender file, count: 100000, chunk size 2048 | 62.69 ms | 50.8 ms | +23.41% | 16 ops/s | 19.7 ops/s | +23.09% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.62 ms | 1.29 ms | +180.06% | 276.19 ops/s | 773.92 ops/s | +180.22% |
| from Date | 4.48 ms | 1.67 ms | +168.64% | 223.19 ops/s | 600.01 ops/s | +168.84% |
| from number | 4.51 ms | 1.64 ms | +174.48% | 222.06 ops/s | 609.72 ops/s | +174.58% |
| from date string | 6.55 ms | 4.41 ms | +48.7% | 152.71 ops/s | 227.04 ops/s | +48.67% |
| from ISO string | 8.21 ms | 6.78 ms | +21.16% | 121.87 ops/s | 147.65 ops/s | +21.16% |
| from SQL string | 8.8 ms | 6.46 ms | +36.31% | 113.84 ops/s | 154.96 ops/s | +36.12% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.83 ms | 2.49 ms | +93.65% | 207.2 ops/s | 401.89 ops/s | +93.96% |
| from Date | 4.92 ms | 2.91 ms | +69.33% | 203.2 ops/s | 365.15 ops/s | +79.7% |
| from ISO string | 8.65 ms | 7.64 ms | +13.13% | 115.73 ops/s | 130.97 ops/s | +13.17% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 4.13 ms | 1.69 ms | +144.82% | 242.57 ops/s | 595.15 ops/s | +145.36% |
| from date string | 5.95 ms | 4.3 ms | +38.38% | 168.14 ops/s | 232.77 ops/s | +38.44% |
| from ISO string | 5.98 ms | 4.27 ms | +39.99% | 167.21 ops/s | 234.04 ops/s | +39.97% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 520.84 us | 243.8 us | +113.64% | 1,923.02 ops/s | 4,114.78 ops/s | +113.97% |
| from number | 1.37 ms | 631.14 us | +116.82% | 731.31 ops/s | 1,588.7 ops/s | +117.24% |
| from string | 3.14 ms | 2.81 ms | +11.61% | 318.71 ops/s | 356.89 ops/s | +11.98% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 550.34 us | 259.61 us | +111.99% | 1,820.43 ops/s | 3,861.35 ops/s | +112.11% |
| toDecimal(18,3) from number | 4.48 ms | 2.09 ms | +113.87% | 223.4 ops/s | 478.03 ops/s | +113.98% |
| toUUID from string | 12.99 ms | 10 ms | +29.96% | 76.99 ops/s | 100.23 ops/s | +30.19% |

## loader profile: memory (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| memory: recommended (optimistic write off, no checkpoint) | 386.51 ms | 410.84 ms | -5.92% | 2.59 ops/s | 2.44 ops/s | -5.88% |
| memory: defaults | 387.11 ms | 404.26 ms | -4.24% | 2.58 ops/s | 2.47 ops/s | -4.24% |

## loader profile: local disk (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| disk: optimistic write off | 435.38 ms | 468.18 ms | -7.01% | 2.3 ops/s | 2.14 ops/s | -6.99% |
| disk: defaults (recommended) | 437.13 ms | 463.33 ms | -5.66% | 2.29 ops/s | 2.16 ops/s | -5.66% |
| disk: periodic checkpoint (everyRows 204_800) | 443.04 ms | 466.33 ms | -5% | 2.26 ops/s | 2.14 ops/s | -5.01% |
| disk: small flushes (flushEveryRows 20_480, WAL path) | 480.79 ms | 502.48 ms | -4.32% | 2.08 ops/s | 1.99 ops/s | -4.33% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.14 ms | 11.78 ms | +104.99% | 41.43 ops/s | 84.98 ops/s | +105.13% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.84 ms | 13.5 ms | +91.42% | 38.71 ops/s | 74.23 ops/s | +91.77% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.59 ms | 16.7 ms | +101.14% | 29.8 ops/s | 60.44 ops/s | +102.85% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 106.15 ms | 69.59 ms | +52.54% | 9.43 ops/s | 14.38 ops/s | +52.6% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 168.32 ms | 112.34 ms | +49.84% | 5.94 ops/s | 8.91 ops/s | +49.93% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 186.14 ms | 107.63 ms | +72.94% | 5.37 ops/s | 9.3 ops/s | +73% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 206.17 ms | 131.66 ms | +56.59% | 4.85 ops/s | 7.6 ops/s | +56.59% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 34.92 ms | 37.33 ms | -6.45% | 28.64 ops/s | 26.8 ops/s | -6.42% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 35.38 ms | 35.46 ms | -0.24% | 28.28 ops/s | 28.21 ops/s | -0.24% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.14 us | 8.07 us | +87.5% | 66,730.01 ops/s | 131,492.68 ops/s | +97.05% |
