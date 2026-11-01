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
| duckdb appender memory, count: 100000, chunk size 2048 | 53.42 ms | 42.05 ms | +27.06% | 18.72 ops/s | 23.79 ops/s | +27.06% |
| duckdb appender, count: 100000, chunk size 1024 | 53.47 ms | 43.22 ms | +23.71% | 18.71 ops/s | 23.14 ops/s | +23.71% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 62.98 ms | 49.35 ms | +27.61% | 15.88 ops/s | 20.26 ops/s | +27.6% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.76 ms | 50.44 ms | +26.39% | 15.69 ops/s | 19.83 ops/s | +26.36% |
| duckdb appender file, count: 100000, chunk size 2048 | 67.25 ms | 53.41 ms | +25.91% | 14.87 ops/s | 18.73 ops/s | +25.92% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.62 ms | 1.24 ms | +190.89% | 276.37 ops/s | 804.41 ops/s | +191.06% |
| from Date | 4.39 ms | 1.71 ms | +156.54% | 228.21 ops/s | 584.74 ops/s | +156.23% |
| from number | 4.47 ms | 1.59 ms | +181.22% | 223.86 ops/s | 629.77 ops/s | +181.32% |
| from date string | 6.46 ms | 4.6 ms | +40.53% | 154.9 ops/s | 217.71 ops/s | +40.55% |
| from ISO string | 8.37 ms | 7.16 ms | +16.79% | 119.81 ops/s | 139.69 ops/s | +16.59% |
| from SQL string | 8.63 ms | 6.86 ms | +25.79% | 115.9 ops/s | 145.74 ops/s | +25.75% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.82 ms | 2.38 ms | +101.99% | 207.79 ops/s | 419.59 ops/s | +101.93% |
| from Date | 4.99 ms | 2.47 ms | +101.98% | 201.07 ops/s | 405.24 ops/s | +101.55% |
| from ISO string | 8.7 ms | 7.49 ms | +16.24% | 115.17 ops/s | 133.62 ops/s | +16.02% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.62 ms | 1.58 ms | +128.33% | 276.63 ops/s | 631.58 ops/s | +128.31% |
| from ISO string | 5.72 ms | 4.22 ms | +35.5% | 174.93 ops/s | 236.91 ops/s | +35.43% |
| from date string | 5.75 ms | 4.25 ms | +35.1% | 174.18 ops/s | 235.41 ops/s | +35.15% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 502.47 us | 223.76 us | +124.55% | 1,993.17 ops/s | 4,473.57 ops/s | +124.45% |
| from number | 1.3 ms | 625.15 us | +107.78% | 770.28 ops/s | 1,604.12 ops/s | +108.25% |
| from string | 3.03 ms | 2.69 ms | +12.52% | 330.33 ops/s | 373.22 ops/s | +12.98% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 508.67 us | 258.43 us | +96.83% | 1,969.37 ops/s | 3,878.05 ops/s | +96.92% |
| toDecimal(18,3) from number | 4.19 ms | 2.04 ms | +105.59% | 238.54 ops/s | 491.08 ops/s | +105.87% |
| toUUID from string | 11.86 ms | 9.82 ms | +20.85% | 84.29 ops/s | 101.93 ops/s | +20.93% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.4 ms | 11.14 ms | +119.05% | 41.04 ops/s | 89.84 ops/s | +118.91% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.15 ms | 12.67 ms | +98.6% | 39.78 ops/s | 79.09 ops/s | +98.83% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.57 ms | 15.14 ms | +115.13% | 30.71 ops/s | 66.06 ops/s | +115.11% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 105.53 ms | 66.75 ms | +58.1% | 9.48 ops/s | 14.99 ops/s | +58.1% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 157.97 ms | 108.9 ms | +45.06% | 6.33 ops/s | 9.19 ops/s | +45.19% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 179.87 ms | 103.02 ms | +74.6% | 5.56 ops/s | 9.71 ops/s | +74.66% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 204.62 ms | 128.44 ms | +59.31% | 4.89 ops/s | 7.79 ops/s | +59.1% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 31.52 ms | 35.11 ms | -10.23% | 31.73 ops/s | 28.49 ops/s | -10.22% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 31.67 ms | 36.33 ms | -12.82% | 31.58 ops/s | 27.53 ops/s | -12.82% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.17 us | 8.06 us | +100.7% | 63,180.7 ops/s | 135,331.45 ops/s | +114.2% |
