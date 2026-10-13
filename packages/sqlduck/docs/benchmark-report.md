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
| duckdb appender, count: 100000, chunk size 1024 | 56.94 ms | 45.47 ms | +25.23% | 17.58 ops/s | 22 ops/s | +25.1% |
| duckdb appender memory, count: 100000, chunk size 2048 | 58.54 ms | 45.16 ms | +29.65% | 17.12 ops/s | 22.15 ops/s | +29.37% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.99 ms | 52 ms | +23.07% | 15.74 ops/s | 19.26 ops/s | +22.39% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 65.57 ms | 50.69 ms | +29.35% | 15.42 ops/s | 19.73 ops/s | +27.91% |
| duckdb appender file, count: 100000, chunk size 2048 | 76.22 ms | 56.32 ms | +35.34% | 13.22 ops/s | 17.81 ops/s | +34.67% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.64 ms | 1.42 ms | +157.03% | 275.01 ops/s | 707.22 ops/s | +157.16% |
| from Date | 4.33 ms | 1.84 ms | +135.18% | 230.93 ops/s | 543.34 ops/s | +135.28% |
| from number | 4.42 ms | 1.79 ms | +146.84% | 226.11 ops/s | 558.67 ops/s | +147.07% |
| from date string | 6.61 ms | 4.97 ms | +32.91% | 151.43 ops/s | 201.25 ops/s | +32.9% |
| from ISO string | 7.95 ms | 7.11 ms | +11.82% | 125.84 ops/s | 140.71 ops/s | +11.82% |
| from SQL string | 8.82 ms | 6.83 ms | +29.16% | 113.57 ops/s | 146.56 ops/s | +29.04% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 4.86 ms | 2.54 ms | +91.74% | 205.8 ops/s | 394.79 ops/s | +91.83% |
| from number | 5.03 ms | 2.53 ms | +99.17% | 199.05 ops/s | 397.07 ops/s | +99.48% |
| from ISO string | 8.53 ms | 7.69 ms | +10.83% | 117.31 ops/s | 130.05 ops/s | +10.86% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.76 ms | 1.66 ms | +126.53% | 266.07 ops/s | 602.58 ops/s | +126.48% |
| from date string | 5.69 ms | 4.45 ms | +27.87% | 175.82 ops/s | 224.97 ops/s | +27.95% |
| from ISO string | 5.71 ms | 4.6 ms | +24% | 175.24 ops/s | 217.59 ops/s | +24.17% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 559.91 us | 238.56 us | +134.7% | 1,789.14 ops/s | 4,215.79 ops/s | +135.63% |
| from number | 1.39 ms | 642.34 us | +116.44% | 719.95 ops/s | 1,562.18 ops/s | +116.98% |
| from string | 3.17 ms | 2.71 ms | +16.96% | 315.92 ops/s | 369.7 ops/s | +17.03% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 566.82 us | 278.85 us | +103.27% | 1,767.46 ops/s | 3,596.84 ops/s | +103.5% |
| toDecimal(18,3) from number | 4.4 ms | 2.13 ms | +106.94% | 227.39 ops/s | 470.98 ops/s | +107.12% |
| toUUID from string | 12.64 ms | 10.2 ms | +23.84% | 79.2 ops/s | 98.21 ops/s | +24.01% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.01 ms | 11.51 ms | +108.73% | 41.7 ops/s | 86.98 ops/s | +108.6% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.91 ms | 13.12 ms | +89.91% | 40.17 ops/s | 76.36 ops/s | +90.07% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.99 ms | 15.64 ms | +104.5% | 31.28 ops/s | 63.96 ops/s | +104.45% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 102.44 ms | 68.68 ms | +49.16% | 9.76 ops/s | 14.56 ops/s | +49.14% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 163.64 ms | 111.85 ms | +46.3% | 6.11 ops/s | 8.94 ops/s | +46.29% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 180.24 ms | 105.89 ms | +70.21% | 5.55 ops/s | 9.45 ops/s | +70.2% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 200.87 ms | 133.9 ms | +50.02% | 4.98 ops/s | 7.47 ops/s | +50.02% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 33.97 ms | 35.27 ms | -3.69% | 29.45 ops/s | 28.36 ops/s | -3.69% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 34 ms | 36.8 ms | -7.61% | 29.42 ops/s | 27.18 ops/s | -7.61% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.72 us | 8.23 us | +91.03% | 64,436.29 ops/s | 130,464.29 ops/s | +102.47% |
