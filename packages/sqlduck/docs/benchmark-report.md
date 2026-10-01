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
| duckdb appender, count: 100000, chunk size 1024 | 63.11 ms | 52.89 ms | +19.33% | 15.85 ops/s | 18.93 ops/s | +19.48% |
| duckdb appender memory, count: 100000, chunk size 2048 | 65.01 ms | 50.18 ms | +29.54% | 15.46 ops/s | 19.99 ops/s | +29.33% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 68.25 ms | 55.14 ms | +23.78% | 14.65 ops/s | 18.15 ops/s | +23.89% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 68.55 ms | 58.05 ms | +18.09% | 14.59 ops/s | 17.26 ops/s | +18.3% |
| duckdb appender file, count: 100000, chunk size 2048 | 72.27 ms | 59.86 ms | +20.73% | 13.84 ops/s | 16.72 ops/s | +20.85% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 4 ms | 1.33 ms | +201.09% | 250.51 ops/s | 754.44 ops/s | +201.16% |
| from Date | 4.11 ms | 1.9 ms | +116.46% | 243.38 ops/s | 528.31 ops/s | +117.08% |
| from number | 4.81 ms | 1.71 ms | +181.32% | 208.12 ops/s | 585.86 ops/s | +181.5% |
| from date string | 6.5 ms | 4.48 ms | +45.22% | 154.2 ops/s | 223.46 ops/s | +44.92% |
| from ISO string | 8.1 ms | 6.78 ms | +19.54% | 123.62 ops/s | 147.57 ops/s | +19.37% |
| from SQL string | 8.68 ms | 6.37 ms | +36.23% | 115.56 ops/s | 157.19 ops/s | +36.02% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.69 ms | 1.65 ms | +123.35% | 271.12 ops/s | 605.3 ops/s | +123.26% |
| from date string | 5.68 ms | 4.32 ms | +31.39% | 176.26 ops/s | 231.72 ops/s | +31.46% |
| from ISO string | 5.76 ms | 4.4 ms | +30.91% | 173.96 ops/s | 227.42 ops/s | +30.73% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 522.43 us | 236.42 us | +120.98% | 1,920.6 ops/s | 4,251.07 ops/s | +121.34% |
| from number | 1.41 ms | 621.84 us | +127.18% | 711.66 ops/s | 1,613.33 ops/s | +126.7% |
| from string | 3.09 ms | 2.59 ms | +19.35% | 324.21 ops/s | 387.57 ops/s | +19.55% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 514.28 us | 226.02 us | +127.54% | 1,948.09 ops/s | 4,435.15 ops/s | +127.67% |
| toDecimal(18,3) from number | 4.31 ms | 2.18 ms | +98.04% | 231.83 ops/s | 461.1 ops/s | +98.9% |
| toUUID from string | 7.2 ms | 6.75 ms | +6.68% | 138.93 ops/s | 149.74 ops/s | +7.78% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.9 ms | 11.72 ms | +104.01% | 41.93 ops/s | 85.54 ops/s | +104.02% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 26.56 ms | 13.31 ms | +99.58% | 37.74 ops/s | 75.41 ops/s | +99.83% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.76 ms | 16.81 ms | +100.78% | 29.68 ops/s | 59.8 ops/s | +101.5% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 100.57 ms | 50.52 ms | +99.06% | 9.95 ops/s | 19.81 ops/s | +99.12% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 172.85 ms | 93.12 ms | +85.62% | 5.81 ops/s | 10.74 ops/s | +84.95% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 33.2 ms | 24.14 ms | +37.54% | 30.13 ops/s | 41.49 ops/s | +37.73% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.36 ms | 22.93 ms | +49.87% | 29.12 ops/s | 43.74 ops/s | +50.17% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.84 us | 9.17 us | +72.78% | 63,835.5 ops/s | 118,203.08 ops/s | +85.17% |
