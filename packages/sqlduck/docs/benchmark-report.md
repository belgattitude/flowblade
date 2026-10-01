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
| duckdb appender, count: 100000, chunk size 1024 | 55.58 ms | 45.56 ms | +21.99% | 17.99 ops/s | 21.95 ops/s | +22.01% |
| duckdb appender memory, count: 100000, chunk size 2048 | 55.86 ms | 45.22 ms | +23.53% | 17.9 ops/s | 22.12 ops/s | +23.56% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 59.84 ms | 50.34 ms | +18.88% | 16.71 ops/s | 19.87 ops/s | +18.88% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 60.02 ms | 51.35 ms | +16.89% | 16.66 ops/s | 19.48 ops/s | +16.88% |
| duckdb appender file, count: 100000, chunk size 2048 | 65.06 ms | 55.66 ms | +16.89% | 15.38 ops/s | 17.99 ops/s | +17.03% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.84 ms | 1.35 ms | +183.58% | 260.61 ops/s | 739.67 ops/s | +183.82% |
| from Date | 4.17 ms | 1.82 ms | +129.11% | 240.15 ops/s | 551.66 ops/s | +129.72% |
| from number | 4.84 ms | 1.74 ms | +178.78% | 206.66 ops/s | 576.37 ops/s | +178.9% |
| from date string | 6.41 ms | 4.51 ms | +42.09% | 156.08 ops/s | 221.68 ops/s | +42.03% |
| from ISO string | 7.91 ms | 6.76 ms | +16.97% | 126.54 ops/s | 147.91 ops/s | +16.89% |
| from SQL string | 8.41 ms | 6.57 ms | +28.09% | 118.93 ops/s | 152.55 ops/s | +28.27% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.67 ms | 1.68 ms | +119.29% | 272.32 ops/s | 597.57 ops/s | +119.44% |
| from ISO string | 5.63 ms | 4.41 ms | +27.69% | 177.53 ops/s | 226.69 ops/s | +27.69% |
| from date string | 5.64 ms | 4.36 ms | +29.34% | 177.32 ops/s | 229.34 ops/s | +29.34% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 508.1 us | 227.02 us | +123.81% | 1,970.27 ops/s | 4,413.53 ops/s | +124.01% |
| from number | 1.33 ms | 643.15 us | +106.52% | 754.04 ops/s | 1,560.49 ops/s | +106.95% |
| from string | 3.1 ms | 2.6 ms | +19.37% | 322.75 ops/s | 385.56 ops/s | +19.46% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 513.98 us | 225.38 us | +128.05% | 1,948 ops/s | 4,444.55 ops/s | +128.16% |
| toDecimal(18,3) from number | 4.38 ms | 2.12 ms | +106.69% | 228.61 ops/s | 472.91 ops/s | +106.87% |
| toUUID from string | 11.96 ms | 9.95 ms | +20.27% | 83.58 ops/s | 100.6 ops/s | +20.35% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.27 ms | 11.58 ms | +100.91% | 43 ops/s | 86.43 ops/s | +100.98% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.48 ms | 13.16 ms | +86.09% | 40.86 ops/s | 76.15 ops/s | +86.35% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.41 ms | 16.23 ms | +99.63% | 30.88 ops/s | 61.62 ops/s | +99.56% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 99.81 ms | 50.36 ms | +98.2% | 10.02 ops/s | 19.87 ops/s | +98.29% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 151.13 ms | 110.64 ms | +36.59% | 6.62 ops/s | 9.04 ops/s | +36.64% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 172.17 ms | 99.63 ms | +72.81% | 5.81 ops/s | 10.04 ops/s | +72.81% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 191.73 ms | 108.51 ms | +76.69% | 5.22 ops/s | 9.22 ops/s | +76.65% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 33.91 ms | 21.91 ms | +54.76% | 29.5 ops/s | 45.68 ops/s | +54.85% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 34.42 ms | 23.73 ms | +45.09% | 29.05 ops/s | 42.18 ops/s | +45.17% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.06 us | 8.56 us | +87.66% | 63,162.46 ops/s | 123,823.31 ops/s | +96.04% |
