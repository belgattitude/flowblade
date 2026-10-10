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
| duckdb appender, count: 100000, chunk size 1024 | 57.42 ms | 44.66 ms | +28.57% | 17.42 ops/s | 22.4 ops/s | +28.58% |
| duckdb appender memory, count: 100000, chunk size 2048 | 57.53 ms | 45.54 ms | +26.34% | 17.39 ops/s | 21.97 ops/s | +26.3% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 62.56 ms | 50.68 ms | +23.44% | 15.99 ops/s | 19.74 ops/s | +23.48% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 64.19 ms | 51.71 ms | +24.14% | 15.58 ops/s | 19.34 ops/s | +24.11% |
| duckdb appender file, count: 100000, chunk size 2048 | 67.94 ms | 55.97 ms | +21.4% | 14.72 ops/s | 17.87 ops/s | +21.36% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.83 ms | 1.35 ms | +182.89% | 261.66 ops/s | 740.83 ops/s | +183.13% |
| from Date | 4.35 ms | 1.97 ms | +121.43% | 229.93 ops/s | 512.01 ops/s | +122.68% |
| from number | 4.66 ms | 1.71 ms | +171.84% | 214.64 ops/s | 584.11 ops/s | +172.14% |
| from date string | 6.82 ms | 4.54 ms | +50.28% | 146.62 ops/s | 220.47 ops/s | +50.37% |
| from ISO string | 8.49 ms | 6.87 ms | +23.72% | 118.01 ops/s | 145.74 ops/s | +23.49% |
| from SQL string | 8.9 ms | 6.52 ms | +36.54% | 112.44 ops/s | 153.57 ops/s | +36.59% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.69 ms | 1.64 ms | +125.56% | 271.11 ops/s | 611.85 ops/s | +125.68% |
| from date string | 5.58 ms | 4.38 ms | +27.47% | 179.3 ops/s | 228.58 ops/s | +27.48% |
| from ISO string | 5.77 ms | 4.47 ms | +29.19% | 173.41 ops/s | 224.06 ops/s | +29.21% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 526.27 us | 205.92 us | +155.57% | 1,906.91 ops/s | 4,864.68 ops/s | +155.11% |
| from number | 1.32 ms | 634.42 us | +107.8% | 758.98 ops/s | 1,581.52 ops/s | +108.37% |
| from string | 3.1 ms | 2.61 ms | +18.85% | 322.81 ops/s | 384.1 ops/s | +18.99% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 523.59 us | 244.59 us | +114.07% | 1,914.21 ops/s | 4,108.54 ops/s | +114.63% |
| toDecimal(18,3) from number | 4.34 ms | 2.07 ms | +109.25% | 230.5 ops/s | 483.35 ops/s | +109.7% |
| toUUID from string | 12.13 ms | 10.63 ms | +14.07% | 82.47 ops/s | 94.16 ops/s | +14.17% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.5 ms | 11.11 ms | +111.49% | 42.63 ops/s | 90.14 ops/s | +111.44% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.45 ms | 12.64 ms | +93.38% | 40.95 ops/s | 79.28 ops/s | +93.61% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.54 ms | 15.13 ms | +121.64% | 29.84 ops/s | 66.11 ops/s | +121.59% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 105 ms | 54.23 ms | +93.64% | 9.53 ops/s | 18.47 ops/s | +93.8% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 160.78 ms | 113.27 ms | +41.95% | 6.22 ops/s | 8.84 ops/s | +42.05% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 181.96 ms | 103.21 ms | +76.31% | 5.5 ops/s | 9.69 ops/s | +76.31% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 209.81 ms | 115.88 ms | +81.06% | 4.77 ops/s | 8.63 ops/s | +80.95% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.06 ms | 21.39 ms | +59.22% | 29.4 ops/s | 46.77 ops/s | +59.08% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 36.24 ms | 23.11 ms | +56.87% | 27.63 ops/s | 43.29 ops/s | +56.66% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.33 us | 8.58 us | +90.42% | 62,381.47 ops/s | 126,896.87 ops/s | +103.42% |
