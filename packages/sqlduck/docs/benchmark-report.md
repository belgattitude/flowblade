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
| duckdb appender, count: 100000, chunk size 1024 | 57.64 ms | 46.62 ms | +23.63% | 17.35 ops/s | 21.46 ops/s | +23.65% |
| duckdb appender memory, count: 100000, chunk size 2048 | 59.06 ms | 46.12 ms | +28.06% | 16.93 ops/s | 21.7 ops/s | +28.12% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.81 ms | 53.35 ms | +19.61% | 15.68 ops/s | 18.78 ops/s | +19.8% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 64.75 ms | 51.23 ms | +26.4% | 15.44 ops/s | 19.52 ops/s | +26.4% |
| duckdb appender file, count: 100000, chunk size 2048 | 68.74 ms | 55.51 ms | +23.84% | 14.55 ops/s | 18.02 ops/s | +23.85% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 4.03 ms | 1.34 ms | +201.01% | 248.73 ops/s | 748.37 ops/s | +200.87% |
| from Date | 4.2 ms | 1.85 ms | +127.01% | 238.23 ops/s | 541.89 ops/s | +127.46% |
| from number | 4.78 ms | 1.77 ms | +170.12% | 209.52 ops/s | 566.7 ops/s | +170.48% |
| from date string | 6.3 ms | 4.69 ms | +34.55% | 158.66 ops/s | 213.57 ops/s | +34.61% |
| from ISO string | 7.78 ms | 6.95 ms | +12.02% | 128.5 ops/s | 144.17 ops/s | +12.19% |
| from SQL string | 8.31 ms | 6.68 ms | +24.31% | 120.4 ops/s | 149.83 ops/s | +24.45% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.56 ms | 1.64 ms | +117.68% | 280.71 ops/s | 611.53 ops/s | +117.85% |
| from ISO string | 5.6 ms | 4.32 ms | +29.64% | 178.77 ops/s | 231.83 ops/s | +29.68% |
| from date string | 5.6 ms | 4.23 ms | +32.42% | 178.79 ops/s | 236.71 ops/s | +32.4% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 518.55 us | 228.29 us | +127.14% | 1,932.57 ops/s | 4,390.12 ops/s | +127.17% |
| from number | 1.34 ms | 622.4 us | +114.64% | 749.3 ops/s | 1,611.38 ops/s | +115.05% |
| from string | 3.15 ms | 2.62 ms | +20.13% | 317.62 ops/s | 381.74 ops/s | +20.19% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 514.59 us | 226.56 us | +127.13% | 1,946.37 ops/s | 4,423.98 ops/s | +127.29% |
| toDecimal(18,3) from number | 4.31 ms | 2.12 ms | +103.57% | 232.36 ops/s | 473.54 ops/s | +103.79% |
| toUUID from string | 11.72 ms | 10.43 ms | +12.31% | 85.37 ops/s | 96.09 ops/s | +12.56% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.14 ms | 11.76 ms | +96.69% | 43.24 ops/s | 85.16 ops/s | +96.95% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.73 ms | 13.06 ms | +89.32% | 40.49 ops/s | 76.66 ops/s | +89.35% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.73 ms | 15.78 ms | +101.13% | 31.52 ops/s | 63.4 ops/s | +101.14% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 98.02 ms | 49.85 ms | +96.61% | 10.2 ops/s | 20.07 ops/s | +96.7% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 153.98 ms | 113.78 ms | +35.34% | 6.5 ops/s | 8.8 ops/s | +35.47% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 167.96 ms | 99.24 ms | +69.24% | 5.95 ops/s | 10.08 ops/s | +69.35% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 189.59 ms | 108.31 ms | +75.04% | 5.28 ops/s | 9.24 ops/s | +75.08% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 30.59 ms | 23.37 ms | +30.88% | 32.72 ops/s | 42.83 ops/s | +30.9% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 30.72 ms | 21.75 ms | +41.28% | 32.56 ops/s | 46.02 ops/s | +41.34% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.42 us | 8.45 us | +94.33% | 61,959.16 ops/s | 125,052.77 ops/s | +101.83% |
