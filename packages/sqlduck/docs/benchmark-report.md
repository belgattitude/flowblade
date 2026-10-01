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
| duckdb appender, count: 100000, chunk size 1024 | 61.82 ms | 49.51 ms | +24.88% | 16.19 ops/s | 20.2 ops/s | +24.83% |
| duckdb appender memory, count: 100000, chunk size 2048 | 63.02 ms | 47.25 ms | +33.39% | 15.87 ops/s | 21.17 ops/s | +33.36% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 67.46 ms | 52.64 ms | +28.14% | 14.83 ops/s | 19 ops/s | +28.09% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 68.46 ms | 55.59 ms | +23.17% | 14.61 ops/s | 18 ops/s | +23.21% |
| duckdb appender file, count: 100000, chunk size 2048 | 71.43 ms | 58.29 ms | +22.53% | 14.01 ops/s | 17.18 ops/s | +22.67% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 4.14 ms | 1.37 ms | +202.83% | 241.46 ops/s | 731.64 ops/s | +203% |
| from Date | 4.41 ms | 1.8 ms | +145.5% | 227.06 ops/s | 557.58 ops/s | +145.56% |
| from number | 5.14 ms | 1.76 ms | +191.78% | 194.84 ops/s | 568.82 ops/s | +191.95% |
| from date string | 6.54 ms | 4.67 ms | +40.18% | 152.87 ops/s | 214.49 ops/s | +40.31% |
| from ISO string | 8.02 ms | 6.92 ms | +15.84% | 124.77 ops/s | 144.59 ops/s | +15.89% |
| from SQL string | 8.95 ms | 6.78 ms | +32.03% | 111.84 ops/s | 147.64 ops/s | +32.01% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.57 ms | 1.72 ms | +107.31% | 280.56 ops/s | 582.74 ops/s | +107.7% |
| from date string | 5.56 ms | 4.46 ms | +24.62% | 179.87 ops/s | 224.13 ops/s | +24.61% |
| from ISO string | 5.61 ms | 4.45 ms | +26.26% | 178.24 ops/s | 225.02 ops/s | +26.25% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 517.34 us | 228.71 us | +126.2% | 1,936.44 ops/s | 4,380.22 ops/s | +126.2% |
| from number | 1.35 ms | 640.78 us | +111.28% | 739.38 ops/s | 1,567.99 ops/s | +112.07% |
| from string | 3.15 ms | 2.64 ms | +19.46% | 317.17 ops/s | 379.02 ops/s | +19.5% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 520.69 us | 224.41 us | +132.02% | 1,924.06 ops/s | 4,460.68 ops/s | +131.84% |
| toDecimal(18,3) from number | 4.37 ms | 2.1 ms | +107.5% | 229.1 ops/s | 475.79 ops/s | +107.68% |
| toUUID from string | 7.54 ms | 6.47 ms | +16.55% | 132.7 ops/s | 155.18 ops/s | +16.95% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 21.96 ms | 11.48 ms | +91.29% | 45.6 ops/s | 87.17 ops/s | +91.16% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 23.01 ms | 12.86 ms | +78.86% | 43.51 ops/s | 77.81 ops/s | +78.84% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 30.56 ms | 16 ms | +91% | 32.74 ops/s | 62.52 ops/s | +90.96% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 84.48 ms | 42.45 ms | +99% | 11.84 ops/s | 23.57 ops/s | +99% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 154.24 ms | 85.26 ms | +80.9% | 6.49 ops/s | 11.73 ops/s | +80.88% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 15.69 ms | 10.82 ms | +44.95% | 63.77 ops/s | 92.72 ops/s | +45.4% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 21.01 ms | 13.82 ms | +52.06% | 47.63 ops/s | 72.51 ops/s | +52.22% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.04 us | 8.72 us | +83.96% | 63,202.5 ops/s | 122,030.72 ops/s | +93.08% |
