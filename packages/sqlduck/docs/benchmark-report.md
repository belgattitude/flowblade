# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.4`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender, count: 100000, chunk size 1024 | 55.04 ms | 44.75 ms | +22.98% | 18.17 ops/s | 22.35 ops/s | +22.98% |
| duckdb appender memory, count: 100000, chunk size 2048 | 55.77 ms | 44.33 ms | +25.82% | 17.95 ops/s | 22.57 ops/s | +25.73% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 62.55 ms | 51.63 ms | +21.14% | 15.99 ops/s | 19.37 ops/s | +21.15% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 62.69 ms | 52.58 ms | +19.23% | 15.95 ops/s | 19.02 ops/s | +19.23% |
| duckdb appender file, count: 100000, chunk size 2048 | 67.07 ms | 56.02 ms | +19.71% | 14.91 ops/s | 17.85 ops/s | +19.71% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.74 ms | 1.28 ms | +191.99% | 267.29 ops/s | 780.98 ops/s | +192.19% |
| from Date | 4.51 ms | 1.67 ms | +170.52% | 222.11 ops/s | 600.83 ops/s | +170.51% |
| from number | 4.61 ms | 1.65 ms | +179% | 217.16 ops/s | 606.33 ops/s | +179.21% |
| from date string | 6.8 ms | 4.59 ms | +48.28% | 147.1 ops/s | 218.48 ops/s | +48.53% |
| from ISO string | 8.36 ms | 6.84 ms | +22.22% | 119.58 ops/s | 146.15 ops/s | +22.22% |
| from SQL string | 9.06 ms | 6.64 ms | +36.54% | 110.39 ops/s | 150.85 ops/s | +36.66% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.92 ms | 2.46 ms | +100.44% | 203.14 ops/s | 407.25 ops/s | +100.48% |
| from Date | 4.93 ms | 2.55 ms | +93.13% | 202.82 ops/s | 391.86 ops/s | +93.2% |
| from ISO string | 8.81 ms | 7.75 ms | +13.66% | 113.57 ops/s | 129.06 ops/s | +13.64% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.7 ms | 1.65 ms | +124.51% | 270.76 ops/s | 608.18 ops/s | +124.62% |
| from date string | 5.77 ms | 4.32 ms | +33.55% | 173.47 ops/s | 231.57 ops/s | +33.49% |
| from ISO string | 5.86 ms | 4.31 ms | +36% | 170.71 ops/s | 232.02 ops/s | +35.91% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 558.91 us | 240.21 us | +132.67% | 1,847.03 ops/s | 4,175.33 ops/s | +126.06% |
| from number | 1.37 ms | 642.16 us | +113.28% | 731.4 ops/s | 1,561.97 ops/s | +113.56% |
| from string | 3.29 ms | 3.01 ms | +9.31% | 304.32 ops/s | 332.65 ops/s | +9.31% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 556.94 us | 255.08 us | +118.34% | 1,840.77 ops/s | 3,928.44 ops/s | +113.41% |
| toDecimal(18,3) from number | 4.55 ms | 2.1 ms | +116.39% | 220.24 ops/s | 476.33 ops/s | +116.28% |
| toUUID from string | 12.89 ms | 10.18 ms | +26.64% | 77.61 ops/s | 98.4 ops/s | +26.78% |

## loader profile: memory (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| memory: defaults | 407.34 ms | 404.78 ms | +0.63% | 2.46 ops/s | 2.47 ops/s | +0.62% |
| memory: recommended (optimistic write off, no checkpoint) | 407.56 ms | 407.59 ms | -0.01% | 2.45 ops/s | 2.45 ops/s | -0.02% |

## loader profile: local disk (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| disk: defaults (recommended) | 450.24 ms | 462.44 ms | -2.64% | 2.22 ops/s | 2.16 ops/s | -2.64% |
| disk: optimistic write off | 450.76 ms | 464.3 ms | -2.92% | 2.22 ops/s | 2.15 ops/s | -2.92% |
| disk: periodic checkpoint (everyRows 204_800) | 456.02 ms | 474.61 ms | -3.92% | 2.19 ops/s | 2.11 ops/s | -3.89% |
| disk: small flushes (flushEveryRows 20_480, WAL path) | 519.6 ms | 507.91 ms | +2.3% | 1.93 ops/s | 1.97 ops/s | +2.16% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 25.14 ms | 11.5 ms | +118.54% | 39.81 ops/s | 87.03 ops/s | +118.62% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.93 ms | 13.12 ms | +97.63% | 38.59 ops/s | 76.35 ops/s | +97.84% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.53 ms | 15.7 ms | +113.53% | 29.84 ops/s | 63.72 ops/s | +113.58% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 109.37 ms | 69.16 ms | +58.13% | 9.15 ops/s | 14.46 ops/s | +58.04% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 165.82 ms | 112.98 ms | +46.76% | 6.03 ops/s | 8.86 ops/s | +46.85% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 187.34 ms | 105.72 ms | +77.2% | 5.34 ops/s | 9.46 ops/s | +77.24% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 209.2 ms | 133.22 ms | +57.04% | 4.78 ops/s | 7.51 ops/s | +57.01% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 33.03 ms | 36.92 ms | -10.54% | 30.29 ops/s | 27.1 ops/s | -10.54% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 33.44 ms | 37.81 ms | -11.56% | 29.92 ops/s | 26.56 ops/s | -11.24% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.06 us | 7.89 us | +103.6% | 62,913.93 ops/s | 135,660.47 ops/s | +115.63% |
