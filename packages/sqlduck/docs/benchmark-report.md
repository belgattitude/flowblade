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
| duckdb appender, count: 100000, chunk size 1024 | 55.48 ms | 46.3 ms | +19.81% | 18.03 ops/s | 21.63 ops/s | +19.95% |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.38 ms | 45.95 ms | +22.68% | 17.74 ops/s | 21.8 ops/s | +22.87% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 67.23 ms | 53.76 ms | +25.04% | 14.88 ops/s | 18.64 ops/s | +25.24% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 68.08 ms | 54.25 ms | +25.49% | 14.69 ops/s | 18.46 ops/s | +25.61% |
| duckdb appender file, count: 100000, chunk size 2048 | 71.38 ms | 57.64 ms | +23.82% | 14.01 ops/s | 17.37 ops/s | +23.93% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.39 ms | 1.56 ms | +117.71% | 295.15 ops/s | 654.12 ops/s | +121.62% |
| from Date | 4.21 ms | 1.87 ms | +125.04% | 237.8 ops/s | 535.37 ops/s | +125.13% |
| from number | 4.38 ms | 1.8 ms | +144.01% | 228.61 ops/s | 557.97 ops/s | +144.07% |
| from date string | 6.65 ms | 4.95 ms | +34.32% | 150.69 ops/s | 202.33 ops/s | +34.27% |
| from ISO string | 7.91 ms | 7.21 ms | +9.71% | 126.45 ops/s | 139.02 ops/s | +9.94% |
| from SQL string | 8.48 ms | 6.98 ms | +21.62% | 117.97 ops/s | 143.78 ops/s | +21.87% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.63 ms | 2.45 ms | +89.02% | 216.29 ops/s | 409.09 ops/s | +89.14% |
| from Date | 4.63 ms | 2.56 ms | +80.72% | 216.25 ops/s | 390.91 ops/s | +80.77% |
| from ISO string | 8.28 ms | 8.03 ms | +3.06% | 120.86 ops/s | 124.85 ops/s | +3.3% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.56 ms | 1.67 ms | +113.68% | 280.91 ops/s | 600.21 ops/s | +113.67% |
| from date string | 5.54 ms | 4.45 ms | +24.62% | 180.49 ops/s | 225.33 ops/s | +24.84% |
| from ISO string | 5.62 ms | 4.37 ms | +28.6% | 178.15 ops/s | 229.04 ops/s | +28.56% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 523.46 us | 184.73 us | +183.37% | 1,915.01 ops/s | 5,574.2 ops/s | +191.08% |
| from number | 1.42 ms | 647.22 us | +119.21% | 707.01 ops/s | 1,549.07 ops/s | +119.1% |
| from string | 3.37 ms | 2.63 ms | +27.84% | 298.17 ops/s | 380.22 ops/s | +27.52% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 524.04 us | 253.53 us | +106.7% | 1,911.87 ops/s | 3,952.78 ops/s | +106.75% |
| toDecimal(18,3) from number | 4.51 ms | 2.15 ms | +109.93% | 221.63 ops/s | 465.5 ops/s | +110.04% |
| toUUID from string | 12.23 ms | 9.89 ms | +23.64% | 81.79 ops/s | 101.29 ops/s | +23.85% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.46 ms | 11.68 ms | +109.42% | 40.9 ops/s | 85.67 ops/s | +109.47% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.76 ms | 13.29 ms | +93.85% | 38.87 ops/s | 75.37 ops/s | +93.91% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.73 ms | 15.6 ms | +109.81% | 30.56 ops/s | 64.11 ops/s | +109.76% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 106.01 ms | 71.21 ms | +48.88% | 9.45 ops/s | 14.07 ops/s | +48.88% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 178.44 ms | 113.21 ms | +57.61% | 5.64 ops/s | 8.84 ops/s | +56.76% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 243.39 ms | 107.5 ms | +126.41% | 4.11 ops/s | 9.31 ops/s | +126.29% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 248.08 ms | 133.87 ms | +85.31% | 4.03 ops/s | 7.47 ops/s | +85.3% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 34.12 ms | 38.75 ms | -11.96% | 29.32 ops/s | 25.84 ops/s | -11.86% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.62 ms | 35.84 ms | -3.4% | 28.91 ops/s | 27.91 ops/s | -3.44% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.7 us | 8.75 us | +90.94% | 61,375.29 ops/s | 125,361.99 ops/s | +104.25% |
