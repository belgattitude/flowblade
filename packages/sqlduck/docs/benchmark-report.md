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
| duckdb appender memory, count: 100000, chunk size 2048 | 59.05 ms | 48.98 ms | +20.56% | 16.94 ops/s | 20.44 ops/s | +20.69% |
| duckdb appender, count: 100000, chunk size 1024 | 61.58 ms | 51.53 ms | +19.51% | 16.25 ops/s | 19.45 ops/s | +19.66% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 64.02 ms | 53.72 ms | +19.18% | 15.62 ops/s | 18.62 ops/s | +19.18% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 65.83 ms | 56.21 ms | +17.12% | 15.21 ops/s | 17.8 ops/s | +17.07% |
| duckdb appender file, count: 100000, chunk size 2048 | 68.29 ms | 58.39 ms | +16.96% | 14.64 ops/s | 17.14 ops/s | +17.05% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.89 ms | 1.35 ms | +187.72% | 257.06 ops/s | 740.65 ops/s | +188.12% |
| from Date | 4.13 ms | 1.87 ms | +120.89% | 242.21 ops/s | 535.45 ops/s | +121.07% |
| from number | 4.8 ms | 1.72 ms | +179.1% | 209.29 ops/s | 582.94 ops/s | +178.53% |
| from date string | 6.39 ms | 4.64 ms | +37.7% | 156.6 ops/s | 216.21 ops/s | +38.06% |
| from ISO string | 7.86 ms | 6.82 ms | +15.14% | 127.35 ops/s | 146.87 ops/s | +15.33% |
| from SQL string | 8.38 ms | 6.44 ms | +30.2% | 119.37 ops/s | 155.42 ops/s | +30.2% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.68 ms | 1.65 ms | +123.1% | 272.31 ops/s | 606.28 ops/s | +122.64% |
| from date string | 5.71 ms | 4.3 ms | +32.76% | 176.65 ops/s | 232.82 ops/s | +31.8% |
| from ISO string | 6.55 ms | 4.36 ms | +50.47% | 155.29 ops/s | 229.64 ops/s | +47.88% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 506.4 us | 248.89 us | +103.46% | 1,978.61 ops/s | 4,184.69 ops/s | +111.5% |
| from number | 1.31 ms | 630.11 us | +108.49% | 761.75 ops/s | 1,593.95 ops/s | +109.25% |
| from string | 3.17 ms | 2.51 ms | +26.3% | 316.86 ops/s | 398.84 ops/s | +25.87% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 509.39 us | 156.77 us | +224.93% | 1,965.69 ops/s | 6,394.23 ops/s | +225.29% |
| toDecimal(18,3) from number | 4.43 ms | 2.11 ms | +109.98% | 225.97 ops/s | 475.3 ops/s | +110.34% |
| toUUID from string | 12.07 ms | 10.19 ms | +18.45% | 82.92 ops/s | 98.22 ops/s | +18.46% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 28.61 ms | 11.52 ms | +148.43% | 35.13 ops/s | 86.95 ops/s | +147.53% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 30.31 ms | 13.05 ms | +132.33% | 33.25 ops/s | 76.78 ops/s | +130.95% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 37.07 ms | 15.86 ms | +133.71% | 27.03 ops/s | 63.11 ops/s | +133.49% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 92.36 ms | 50.58 ms | +82.6% | 10.83 ops/s | 19.77 ops/s | +82.62% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 160.02 ms | 100.66 ms | +58.97% | 6.25 ops/s | 9.94 ops/s | +59.13% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 178.19 ms | 108.84 ms | +63.71% | 5.61 ops/s | 9.19 ops/s | +63.78% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.15 ms | 23.11 ms | +39.12% | 31.14 ops/s | 43.29 ops/s | +38.99% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.41 ms | 21.5 ms | +60.05% | 29.07 ops/s | 46.54 ops/s | +60.08% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.57 us | 8.65 us | +80.02% | 64,943.55 ops/s | 122,504.72 ops/s | +88.63% |
