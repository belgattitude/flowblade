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
| duckdb appender, count: 100000, chunk size 1024 | 56.48 ms | 45.69 ms | +23.62% | 17.71 ops/s | 21.9 ops/s | +23.67% |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.82 ms | 45.18 ms | +25.77% | 17.6 ops/s | 22.16 ops/s | +25.89% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 62.06 ms | 53.46 ms | +16.1% | 16.12 ops/s | 18.74 ops/s | +16.24% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 62.42 ms | 50.79 ms | +22.91% | 16.03 ops/s | 19.7 ops/s | +22.93% |
| duckdb appender file, count: 100000, chunk size 2048 | 67.77 ms | 54.95 ms | +23.35% | 14.76 ops/s | 18.21 ops/s | +23.35% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.99 ms | 1.33 ms | +201% | 250.58 ops/s | 754.6 ops/s | +201.14% |
| from Date | 4.31 ms | 1.77 ms | +143.01% | 232.05 ops/s | 564.53 ops/s | +143.27% |
| from number | 5.02 ms | 1.72 ms | +191.07% | 199.47 ops/s | 580.93 ops/s | +191.23% |
| from date string | 7.44 ms | 4.57 ms | +62.79% | 134.7 ops/s | 219.03 ops/s | +62.6% |
| from ISO string | 8.7 ms | 6.94 ms | +25.4% | 115.07 ops/s | 144.33 ops/s | +25.43% |
| from SQL string | 9.29 ms | 6.72 ms | +38.23% | 107.7 ops/s | 149.55 ops/s | +38.85% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.97 ms | 1.73 ms | +129.71% | 253.51 ops/s | 583.78 ops/s | +130.28% |
| from ISO string | 6.08 ms | 4.46 ms | +36.26% | 164.49 ops/s | 224.15 ops/s | +36.27% |
| from date string | 6.12 ms | 4.34 ms | +40.94% | 163.49 ops/s | 230.4 ops/s | +40.93% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 527.68 us | 213.19 us | +147.52% | 1,901.57 ops/s | 4,705.95 ops/s | +147.48% |
| from number | 1.36 ms | 630.7 us | +115.18% | 737.53 ops/s | 1,590.48 ops/s | +115.65% |
| from string | 3.21 ms | 2.57 ms | +25.32% | 311.49 ops/s | 390.24 ops/s | +25.28% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 541.38 us | 257.13 us | +110.55% | 1,858.45 ops/s | 3,973.27 ops/s | +113.8% |
| toDecimal(18,3) from number | 4.41 ms | 2.03 ms | +116.9% | 226.95 ops/s | 492.51 ops/s | +117.01% |
| toUUID from string | 12.8 ms | 9.87 ms | +29.69% | 78.19 ops/s | 101.47 ops/s | +29.77% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.44 ms | 11.12 ms | +110.81% | 42.68 ops/s | 90.02 ops/s | +110.91% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.04 ms | 12.69 ms | +97.36% | 39.99 ops/s | 78.92 ops/s | +97.34% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.69 ms | 15.56 ms | +110.15% | 30.6 ops/s | 64.34 ops/s | +110.26% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 105.17 ms | 54.14 ms | +94.24% | 9.51 ops/s | 18.48 ops/s | +94.27% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 163.19 ms | 112.78 ms | +44.7% | 6.13 ops/s | 8.87 ops/s | +44.77% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 184.06 ms | 109.79 ms | +67.64% | 5.43 ops/s | 9.11 ops/s | +67.62% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 208.35 ms | 117.73 ms | +76.97% | 4.81 ops/s | 8.5 ops/s | +76.75% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 33.49 ms | 22.68 ms | +47.66% | 29.89 ops/s | 44.11 ops/s | +47.6% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 34.63 ms | 20.78 ms | +66.66% | 28.9 ops/s | 48.15 ops/s | +66.61% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.61 us | 8.26 us | +101.05% | 61,553.32 ops/s | 129,386.6 ops/s | +110.2% |
