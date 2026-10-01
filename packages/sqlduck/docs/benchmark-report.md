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
| duckdb appender memory, count: 100000, chunk size 2048 | 58.9 ms | 47.07 ms | +25.14% | 16.98 ops/s | 21.25 ops/s | +25.14% |
| duckdb appender, count: 100000, chunk size 1024 | 59.03 ms | 48.42 ms | +21.91% | 16.94 ops/s | 20.65 ops/s | +21.91% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 63.72 ms | 52.57 ms | +21.2% | 15.7 ops/s | 19.02 ops/s | +21.2% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 64.79 ms | 54.04 ms | +19.89% | 15.44 ops/s | 18.51 ops/s | +19.88% |
| duckdb appender file, count: 100000, chunk size 2048 | 68.21 ms | 56.94 ms | +19.8% | 14.66 ops/s | 17.56 ops/s | +19.8% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.89 ms | 1.38 ms | +181.82% | 257.25 ops/s | 725.86 ops/s | +182.17% |
| from Date | 4.28 ms | 1.9 ms | +125.17% | 234.15 ops/s | 527.08 ops/s | +125.11% |
| from number | 4.85 ms | 1.77 ms | +174.52% | 206.33 ops/s | 566.68 ops/s | +174.64% |
| from date string | 6.5 ms | 4.49 ms | +44.76% | 154.03 ops/s | 222.79 ops/s | +44.64% |
| from ISO string | 7.94 ms | 6.73 ms | +18.06% | 126 ops/s | 148.69 ops/s | +18.01% |
| from SQL string | 8.5 ms | 6.38 ms | +33.28% | 117.67 ops/s | 156.78 ops/s | +33.24% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.64 ms | 1.68 ms | +116.71% | 275.27 ops/s | 596.74 ops/s | +116.78% |
| from date string | 5.68 ms | 4.33 ms | +31.01% | 176.25 ops/s | 230.87 ops/s | +30.99% |
| from ISO string | 5.72 ms | 4.29 ms | +33.31% | 174.86 ops/s | 233.1 ops/s | +33.3% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 530.46 us | 226.45 us | +134.25% | 1,893.14 ops/s | 4,420.93 ops/s | +133.52% |
| from number | 1.36 ms | 635.89 us | +113.09% | 739.3 ops/s | 1,578.46 ops/s | +113.51% |
| from string | 3.15 ms | 2.57 ms | +22.67% | 317.86 ops/s | 389.86 ops/s | +22.65% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 513.1 us | 226.02 us | +127.01% | 1,951.48 ops/s | 4,430.81 ops/s | +127.05% |
| toDecimal(18,3) from number | 4.31 ms | 2.09 ms | +106.85% | 231.88 ops/s | 479.85 ops/s | +106.94% |
| toUUID from string | 12.39 ms | 9.8 ms | +26.46% | 80.74 ops/s | 102.11 ops/s | +26.47% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.48 ms | 11.58 ms | +102.72% | 42.64 ops/s | 86.42 ops/s | +102.7% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25 ms | 13.02 ms | +92.04% | 40.04 ops/s | 76.93 ops/s | +92.12% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.05 ms | 15.95 ms | +107.26% | 30.27 ops/s | 62.73 ops/s | +107.21% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 100.14 ms | 50.28 ms | +99.15% | 10 ops/s | 19.9 ops/s | +99.03% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 154.32 ms | 111.33 ms | +38.62% | 6.48 ops/s | 9 ops/s | +38.88% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 172.85 ms | 99.14 ms | +74.35% | 5.79 ops/s | 10.09 ops/s | +74.34% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 188.11 ms | 108.14 ms | +73.95% | 5.32 ops/s | 9.25 ops/s | +73.95% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.49 ms | 23.42 ms | +38.72% | 30.78 ops/s | 42.75 ops/s | +38.88% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 32.61 ms | 21.54 ms | +51.42% | 30.68 ops/s | 46.46 ops/s | +51.43% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.85 us | 8.45 us | +87.51% | 63,715.5 ops/s | 124,831.01 ops/s | +95.92% |
