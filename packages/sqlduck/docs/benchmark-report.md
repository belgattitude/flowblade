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
| duckdb appender, count: 100000, chunk size 1024 | 56.6 ms | 44.54 ms | +27.09% | 17.67 ops/s | 22.46 ops/s | +27.08% |
| duckdb appender memory, count: 100000, chunk size 2048 | 59.31 ms | 44.22 ms | +34.12% | 16.9 ops/s | 22.62 ops/s | +33.82% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 62.92 ms | 50.79 ms | +23.89% | 15.9 ops/s | 19.71 ops/s | +24% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 62.96 ms | 50.04 ms | +25.83% | 15.9 ops/s | 19.99 ops/s | +25.78% |
| duckdb appender file, count: 100000, chunk size 2048 | 66.52 ms | 53.86 ms | +23.51% | 15.04 ops/s | 18.57 ops/s | +23.5% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.93 ms | 1.33 ms | +195.38% | 254.68 ops/s | 752.76 ops/s | +195.56% |
| from Date | 4.28 ms | 1.86 ms | +130.19% | 234.02 ops/s | 539.09 ops/s | +130.36% |
| from number | 4.74 ms | 1.72 ms | +176.06% | 211.03 ops/s | 583.26 ops/s | +176.39% |
| from date string | 7.13 ms | 4.48 ms | +59.1% | 140.25 ops/s | 223.21 ops/s | +59.16% |
| from ISO string | 8.38 ms | 6.84 ms | +22.44% | 119.34 ops/s | 146.2 ops/s | +22.5% |
| from SQL string | 8.99 ms | 6.41 ms | +40.16% | 111.33 ops/s | 156.01 ops/s | +40.13% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.71 ms | 1.64 ms | +127.01% | 269.57 ops/s | 612.28 ops/s | +127.13% |
| from ISO string | 5.72 ms | 4.57 ms | +25.15% | 174.99 ops/s | 219.09 ops/s | +25.2% |
| from date string | 5.78 ms | 4.55 ms | +27.24% | 173.04 ops/s | 220.11 ops/s | +27.2% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 541.33 us | 208.76 us | +159.31% | 1,851.39 ops/s | 4,799.31 ops/s | +159.23% |
| from number | 1.37 ms | 631.73 us | +116.77% | 731.12 ops/s | 1,589.35 ops/s | +117.39% |
| from string | 3.22 ms | 2.58 ms | +24.85% | 311.03 ops/s | 388.25 ops/s | +24.83% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 525.44 us | 229.91 us | +128.54% | 1,906.16 ops/s | 4,356.91 ops/s | +128.57% |
| toDecimal(18,3) from number | 4.55 ms | 2.07 ms | +119.89% | 219.8 ops/s | 483.82 ops/s | +120.12% |
| toUUID from string | 12.58 ms | 9.92 ms | +26.83% | 79.55 ops/s | 100.93 ops/s | +26.89% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.16 ms | 11.56 ms | +109.03% | 41.42 ops/s | 86.61 ops/s | +109.1% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.54 ms | 13.16 ms | +94.07% | 39.19 ops/s | 76.13 ops/s | +94.28% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.29 ms | 15.97 ms | +102.15% | 30.98 ops/s | 62.64 ops/s | +102.21% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 105.53 ms | 70.89 ms | +48.86% | 9.48 ops/s | 14.11 ops/s | +48.87% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 164.06 ms | 114.44 ms | +43.36% | 6.1 ops/s | 8.75 ops/s | +43.5% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 181.57 ms | 108.05 ms | +68.04% | 5.51 ops/s | 9.26 ops/s | +68.04% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 201.8 ms | 136.32 ms | +48.03% | 4.96 ops/s | 7.34 ops/s | +48.03% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.33 ms | 37.66 ms | -14.14% | 30.94 ops/s | 26.57 ops/s | -14.1% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 32.46 ms | 35.1 ms | -7.52% | 30.83 ops/s | 28.5 ops/s | -7.55% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.96 us | 8.11 us | +96.74% | 63,304.82 ops/s | 130,650.28 ops/s | +106.38% |
