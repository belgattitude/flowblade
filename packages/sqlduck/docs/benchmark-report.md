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
| duckdb appender memory, count: 100000, chunk size 2048 | 57.14 ms | 43.37 ms | +31.74% | 17.51 ops/s | 23.06 ops/s | +31.72% |
| duckdb appender, count: 100000, chunk size 1024 | 60.12 ms | 44.99 ms | +33.62% | 16.76 ops/s | 22.23 ops/s | +32.62% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 61.09 ms | 50.12 ms | +21.89% | 16.38 ops/s | 19.96 ops/s | +21.91% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 61.18 ms | 48.62 ms | +25.84% | 16.35 ops/s | 20.57 ops/s | +25.82% |
| duckdb appender file, count: 100000, chunk size 2048 | 64.71 ms | 52.59 ms | +23.03% | 15.46 ops/s | 19.02 ops/s | +23.04% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.88 ms | 1.37 ms | +184.1% | 257.61 ops/s | 735.13 ops/s | +185.36% |
| from Date | 4.28 ms | 1.84 ms | +132.55% | 233.76 ops/s | 544.22 ops/s | +132.81% |
| from number | 4.8 ms | 1.73 ms | +177.89% | 208.27 ops/s | 579.95 ops/s | +178.46% |
| from date string | 7.04 ms | 4.52 ms | +55.83% | 142.14 ops/s | 221.61 ops/s | +55.91% |
| from ISO string | 8.32 ms | 6.83 ms | +21.85% | 120.18 ops/s | 146.46 ops/s | +21.87% |
| from SQL string | 8.89 ms | 6.44 ms | +38.05% | 112.56 ops/s | 155.45 ops/s | +38.1% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.63 ms | 1.62 ms | +123.75% | 275.44 ops/s | 616.78 ops/s | +123.92% |
| from ISO string | 5.61 ms | 4.33 ms | +29.78% | 178.18 ops/s | 231.28 ops/s | +29.8% |
| from date string | 5.62 ms | 4.29 ms | +30.88% | 178.14 ops/s | 233.15 ops/s | +30.88% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 522.49 us | 208.13 us | +151.04% | 1,919.41 ops/s | 4,813.32 ops/s | +150.77% |
| from number | 1.35 ms | 626.35 us | +115.81% | 740.91 ops/s | 1,603.27 ops/s | +116.39% |
| from string | 3.12 ms | 2.59 ms | +20.33% | 320.81 ops/s | 386.39 ops/s | +20.44% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 535.47 us | 249.64 us | +114.5% | 1,875.07 ops/s | 4,015.12 ops/s | +114.13% |
| toDecimal(18,3) from number | 4.48 ms | 2.08 ms | +115.31% | 223.3 ops/s | 481.07 ops/s | +115.44% |
| toUUID from string | 12.06 ms | 9.93 ms | +21.54% | 82.92 ops/s | 100.84 ops/s | +21.61% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.27 ms | 11.52 ms | +110.68% | 41.23 ops/s | 86.93 ops/s | +110.84% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.11 ms | 12.87 ms | +95.11% | 39.87 ops/s | 77.82 ops/s | +95.19% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.92 ms | 15.47 ms | +106.3% | 31.34 ops/s | 64.66 ops/s | +106.35% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 103.44 ms | 68.83 ms | +50.29% | 9.68 ops/s | 14.54 ops/s | +50.21% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 163.92 ms | 112.39 ms | +45.85% | 6.1 ops/s | 8.9 ops/s | +45.92% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 185.88 ms | 108.92 ms | +70.66% | 5.38 ops/s | 9.19 ops/s | +70.88% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 201.04 ms | 131.71 ms | +52.64% | 4.97 ops/s | 7.6 ops/s | +52.69% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 33.5 ms | 36.21 ms | -7.49% | 29.86 ops/s | 27.62 ops/s | -7.49% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 33.77 ms | 35.32 ms | -4.39% | 29.62 ops/s | 28.32 ops/s | -4.36% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.11 us | 8.16 us | +97.25% | 62,840.21 ops/s | 130,643.74 ops/s | +107.9% |
