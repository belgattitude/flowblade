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
| duckdb appender memory, count: 100000, chunk size 2048 | 53.81 ms | 41.7 ms | +29.05% | 18.59 ops/s | 23.98 ops/s | +28.99% |
| duckdb appender, count: 100000, chunk size 1024 | 54.46 ms | 43.31 ms | +25.75% | 18.39 ops/s | 23.1 ops/s | +25.62% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 57.5 ms | 46.83 ms | +22.79% | 17.39 ops/s | 21.36 ops/s | +22.78% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 58.42 ms | 48.4 ms | +20.7% | 17.13 ops/s | 20.69 ops/s | +20.78% |
| duckdb appender file, count: 100000, chunk size 2048 | 63.29 ms | 51.29 ms | +23.4% | 15.81 ops/s | 19.51 ops/s | +23.46% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.82 ms | 1.35 ms | +183.48% | 262.15 ops/s | 743.65 ops/s | +183.68% |
| from Date | 4.17 ms | 1.86 ms | +124.65% | 240.1 ops/s | 539.67 ops/s | +124.77% |
| from number | 4.66 ms | 1.75 ms | +166.67% | 214.75 ops/s | 574.35 ops/s | +167.45% |
| from date string | 6.35 ms | 4.51 ms | +40.84% | 157.44 ops/s | 221.86 ops/s | +40.92% |
| from ISO string | 7.88 ms | 6.95 ms | +13.41% | 126.98 ops/s | 144.49 ops/s | +13.79% |
| from SQL string | 8.39 ms | 6.57 ms | +27.63% | 119.23 ops/s | 152.42 ops/s | +27.84% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.61 ms | 1.92 ms | +88.46% | 277.21 ops/s | 537.01 ops/s | +93.72% |
| from date string | 5.62 ms | 4.48 ms | +25.54% | 178.02 ops/s | 224.19 ops/s | +25.94% |
| from ISO string | 5.72 ms | 4.37 ms | +30.85% | 175.05 ops/s | 229.06 ops/s | +30.85% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 513.24 us | 239.33 us | +114.45% | 1,955.46 ops/s | 4,229.58 ops/s | +116.3% |
| from number | 1.32 ms | 632.74 us | +108.02% | 761.02 ops/s | 1,590.42 ops/s | +108.99% |
| from string | 3.01 ms | 2.64 ms | +14.29% | 332.08 ops/s | 380.37 ops/s | +14.54% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 506.82 us | 220.02 us | +130.35% | 1,977.38 ops/s | 4,556.14 ops/s | +130.41% |
| toDecimal(18,3) from number | 4.42 ms | 2.11 ms | +108.94% | 226.75 ops/s | 474.83 ops/s | +109.41% |
| toUUID from string | 12.04 ms | 9.72 ms | +23.75% | 83.14 ops/s | 102.95 ops/s | +23.83% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 22.96 ms | 12.38 ms | +85.43% | 43.58 ops/s | 82.15 ops/s | +88.49% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.05 ms | 14.86 ms | +61.89% | 41.6 ops/s | 68.49 ops/s | +64.62% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.58 ms | 16.09 ms | +96.22% | 31.68 ops/s | 62.17 ops/s | +96.27% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 96.71 ms | 50.73 ms | +90.65% | 10.34 ops/s | 19.76 ops/s | +91.03% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 158.35 ms | 113.38 ms | +39.67% | 6.32 ops/s | 8.86 ops/s | +40.14% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 173.95 ms | 98.74 ms | +76.18% | 5.76 ops/s | 10.13 ops/s | +75.88% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 185.27 ms | 108.84 ms | +70.22% | 5.4 ops/s | 9.19 ops/s | +70.26% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 33.56 ms | 23.09 ms | +45.36% | 29.84 ops/s | 43.35 ops/s | +45.3% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.58 ms | 21.35 ms | +61.95% | 28.96 ops/s | 46.88 ops/s | +61.89% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.29 us | 8.56 us | +90.35% | 62,886.48 ops/s | 123,705.7 ops/s | +96.71% |
