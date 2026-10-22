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
| duckdb appender, count: 100000, chunk size 1024 | 58.42 ms | 44.49 ms | +31.32% | 17.21 ops/s | 22.48 ops/s | +30.61% |
| duckdb appender memory, count: 100000, chunk size 2048 | 59.98 ms | 45.07 ms | +33.07% | 16.84 ops/s | 22.22 ops/s | +31.91% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 64.89 ms | 54.2 ms | +19.72% | 15.42 ops/s | 18.51 ops/s | +20.04% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 71.88 ms | 51.44 ms | +39.74% | 14.02 ops/s | 19.44 ops/s | +38.7% |
| duckdb appender file, count: 100000, chunk size 2048 | 84.34 ms | 55.63 ms | +51.61% | 11.96 ops/s | 17.98 ops/s | +50.34% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.82 ms | 1.29 ms | +195.44% | 264.94 ops/s | 774.92 ops/s | +192.49% |
| from Date | 4.59 ms | 1.71 ms | +168.43% | 218.59 ops/s | 586.33 ops/s | +168.23% |
| from number | 4.7 ms | 1.66 ms | +183.34% | 213.48 ops/s | 603.92 ops/s | +182.9% |
| from date string | 7.28 ms | 4.55 ms | +60.1% | 138.5 ops/s | 220.08 ops/s | +58.9% |
| from ISO string | 9.47 ms | 7.05 ms | +34.26% | 106.85 ops/s | 141.83 ops/s | +32.73% |
| from SQL string | 9.97 ms | 6.69 ms | +49.02% | 101.04 ops/s | 149.57 ops/s | +48.03% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 5.13 ms | 2.62 ms | +95.79% | 195.36 ops/s | 384.78 ops/s | +96.96% |
| from number | 5.28 ms | 2.53 ms | +108.8% | 189.77 ops/s | 395.89 ops/s | +108.62% |
| from ISO string | 10.35 ms | 7.88 ms | +31.28% | 97.87 ops/s | 127.03 ops/s | +29.8% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.79 ms | 1.67 ms | +127.31% | 264.58 ops/s | 600.45 ops/s | +126.94% |
| from date string | 6.27 ms | 4.37 ms | +43.25% | 160.6 ops/s | 228.81 ops/s | +42.47% |
| from ISO string | 6.62 ms | 4.39 ms | +50.76% | 152.68 ops/s | 227.82 ops/s | +49.22% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 535.82 us | 256.77 us | +108.68% | 1,884.6 ops/s | 3,933.34 ops/s | +108.71% |
| from number | 1.44 ms | 667.27 us | +115.45% | 701.57 ops/s | 1,507.91 ops/s | +114.93% |
| from string | 3.28 ms | 2.75 ms | +19.04% | 305.52 ops/s | 364.31 ops/s | +19.24% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 572.7 us | 238.85 us | +139.78% | 1,787.75 ops/s | 4,197.29 ops/s | +134.78% |
| toDecimal(18,3) from number | 4.48 ms | 2.11 ms | +112.18% | 223.72 ops/s | 474.89 ops/s | +112.27% |
| toUUID from string | 14 ms | 11 ms | +27.26% | 71.74 ops/s | 91.19 ops/s | +27.12% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 25.14 ms | 12.43 ms | +102.21% | 39.82 ops/s | 80.87 ops/s | +103.11% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 26.48 ms | 14.2 ms | +86.39% | 37.83 ops/s | 70.97 ops/s | +87.58% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 35.44 ms | 16.46 ms | +115.32% | 28.34 ops/s | 60.82 ops/s | +114.63% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 109.56 ms | 72.16 ms | +51.84% | 9.14 ops/s | 13.88 ops/s | +51.78% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 169.02 ms | 120.85 ms | +39.86% | 5.93 ops/s | 8.28 ops/s | +39.74% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 195.75 ms | 112.26 ms | +74.37% | 5.17 ops/s | 8.93 ops/s | +72.81% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 207.83 ms | 142.33 ms | +46.02% | 4.82 ops/s | 7.03 ops/s | +46.07% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 34.48 ms | 38.36 ms | -10.13% | 29.02 ops/s | 26.07 ops/s | -10.15% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.79 ms | 37.22 ms | -6.54% | 28.88 ops/s | 26.9 ops/s | -6.86% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 18.1 us | 8.93 us | +102.73% | 59,040.09 ops/s | 123,739.26 ops/s | +109.59% |
