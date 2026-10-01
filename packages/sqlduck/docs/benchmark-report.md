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
| duckdb appender memory, count: 100000, chunk size 2048 | 64.64 ms | 50.54 ms | +27.91% | 15.48 ops/s | 19.8 ops/s | +27.89% |
| duckdb appender, count: 100000, chunk size 1024 | 65.17 ms | 51.2 ms | +27.28% | 15.35 ops/s | 19.54 ops/s | +27.3% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 69.25 ms | 57.73 ms | +19.96% | 14.44 ops/s | 17.38 ops/s | +20.34% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 69.97 ms | 58.39 ms | +19.83% | 14.3 ops/s | 17.14 ops/s | +19.92% |
| duckdb appender file, count: 100000, chunk size 2048 | 75.33 ms | 59.19 ms | +27.27% | 13.28 ops/s | 16.9 ops/s | +27.27% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.87 ms | 1.35 ms | +185.96% | 258.57 ops/s | 740 ops/s | +186.19% |
| from Date | 4.2 ms | 1.88 ms | +123.08% | 238.45 ops/s | 532.59 ops/s | +123.35% |
| from number | 4.68 ms | 1.71 ms | +172.78% | 214.06 ops/s | 584.49 ops/s | +173.04% |
| from date string | 6.45 ms | 4.62 ms | +39.39% | 155.19 ops/s | 216.34 ops/s | +39.41% |
| from ISO string | 7.99 ms | 7.07 ms | +13.01% | 125.21 ops/s | 141.55 ops/s | +13.04% |
| from SQL string | 8.44 ms | 6.66 ms | +26.6% | 118.57 ops/s | 150.19 ops/s | +26.66% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.72 ms | 1.66 ms | +124.84% | 268.82 ops/s | 604.57 ops/s | +124.9% |
| from ISO string | 5.76 ms | 4.41 ms | +30.44% | 173.78 ops/s | 226.74 ops/s | +30.47% |
| from date string | 5.76 ms | 4.45 ms | +29.36% | 173.75 ops/s | 224.89 ops/s | +29.43% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 513.6 us | 225.91 us | +127.35% | 1,950.74 ops/s | 4,437.77 ops/s | +127.49% |
| from number | 1.32 ms | 627.68 us | +111.05% | 755.51 ops/s | 1,600.55 ops/s | +111.85% |
| from string | 3.09 ms | 2.66 ms | +16.16% | 324.09 ops/s | 380.75 ops/s | +17.48% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 546.87 us | 222.79 us | +145.46% | 1,840.41 ops/s | 4,495.02 ops/s | +144.24% |
| toDecimal(18,3) from number | 4.26 ms | 2.03 ms | +110.23% | 234.78 ops/s | 494.37 ops/s | +110.56% |
| toUUID from string | 7.72 ms | 6.48 ms | +19.23% | 129.88 ops/s | 154.61 ops/s | +19.04% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.23 ms | 11.9 ms | +95.2% | 43.08 ops/s | 84.17 ops/s | +95.37% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.35 ms | 13.13 ms | +85.53% | 41.09 ops/s | 76.3 ops/s | +85.68% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.2 ms | 15.88 ms | +102.75% | 31.07 ops/s | 62.98 ops/s | +102.74% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 99.93 ms | 51.2 ms | +95.17% | 10.01 ops/s | 19.55 ops/s | +95.31% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 173.07 ms | 98.09 ms | +76.44% | 5.78 ops/s | 10.2 ops/s | +76.42% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.13 us | 8.98 us | +79.71% | 63,152.77 ops/s | 119,772.64 ops/s | +89.66% |
