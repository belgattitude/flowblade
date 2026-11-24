# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.5`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.75 ms | 45.25 ms | +25.4% | 17.66 ops/s | 22.11 ops/s | +25.22% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 59.15 ms | 47.66 ms | +24.12% | 16.93 ops/s | 20.99 ops/s | +23.95% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 60.26 ms | 48.76 ms | +23.57% | 16.63 ops/s | 20.51 ops/s | +23.35% |
| duckdb appender file, count: 100000, chunk size 2048 | 64 ms | 50.3 ms | +27.24% | 15.7 ops/s | 19.88 ops/s | +26.63% |
| duckdb appender, count: 100000, chunk size 1024 | 77.3 ms | 45.31 ms | +70.61% | 13.34 ops/s | 22.08 ops/s | +65.51% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.41 ms | 1.55 ms | +119.39% | 293.67 ops/s | 663.79 ops/s | +126.04% |
| from Date | 4.21 ms | 2.55 ms | +65.36% | 237.84 ops/s | 393.98 ops/s | +65.65% |
| from number | 4.28 ms | 1.9 ms | +125.02% | 233.95 ops/s | 537.46 ops/s | +129.73% |
| from date string | 6.39 ms | 5.15 ms | +24.12% | 156.57 ops/s | 198.61 ops/s | +26.85% |
| from ISO string | 8.08 ms | 8.1 ms | -0.21% | 123.88 ops/s | 127.59 ops/s | +3% |
| from SQL string | 8.63 ms | 7.01 ms | +23.12% | 115.9 ops/s | 143.64 ops/s | +23.94% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.84 ms | 2.56 ms | +89.05% | 206.55 ops/s | 392.52 ops/s | +90.04% |
| from Date | 4.92 ms | 3.09 ms | +59.21% | 203.39 ops/s | 337.62 ops/s | +65.99% |
| from ISO string | 8.61 ms | 8.02 ms | +7.32% | 116.17 ops/s | 124.86 ops/s | +7.48% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.61 ms | 1.68 ms | +115.25% | 276.82 ops/s | 597.14 ops/s | +115.71% |
| from ISO string | 5.72 ms | 4.49 ms | +27.35% | 175.02 ops/s | 223.03 ops/s | +27.43% |
| from date string | 5.74 ms | 4.43 ms | +29.44% | 174.79 ops/s | 226.14 ops/s | +29.38% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 518.96 us | 235.15 us | +120.69% | 1,930.4 ops/s | 4,258.21 ops/s | +120.59% |
| from number | 1.35 ms | 666.33 us | +101.9% | 744.39 ops/s | 1,517.04 ops/s | +103.79% |
| from string | 3.15 ms | 2.97 ms | +5.95% | 317.54 ops/s | 338.26 ops/s | +6.53% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 523.99 us | 252.22 us | +107.75% | 1,912.61 ops/s | 3,985.18 ops/s | +108.36% |
| toDecimal(18,3) from number | 4.36 ms | 2.07 ms | +110.87% | 229.68 ops/s | 484.52 ops/s | +110.95% |
| toUUID from string | 12.64 ms | 10.77 ms | +17.44% | 79.12 ops/s | 93.05 ops/s | +17.6% |

## loader profile: memory (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| memory: recommended (optimistic write off, no checkpoint) | 398.55 ms | 459.75 ms | -13.31% | 2.51 ops/s | 2.18 ops/s | -13% |
| memory: defaults | 399.5 ms | 449.83 ms | -11.19% | 2.5 ops/s | 2.24 ops/s | -10.56% |

## loader profile: local disk (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| disk: defaults (recommended) | 438.76 ms | 463.84 ms | -5.41% | 2.28 ops/s | 2.16 ops/s | -5.41% |
| disk: optimistic write off | 443.49 ms | 526.69 ms | -15.8% | 2.26 ops/s | 1.93 ops/s | -14.52% |
| disk: periodic checkpoint (everyRows 204_800) | 448.82 ms | 471.84 ms | -4.88% | 2.23 ops/s | 2.12 ops/s | -4.88% |
| disk: small flushes (flushEveryRows 20_480, WAL path) | 485.56 ms | 534.14 ms | -9.09% | 2.06 ops/s | 1.87 ops/s | -9.08% |

## loader strategies: 5 columns, memory (count: 100000)

Source: `bench/loader-strategies.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| NativeChunkAppenderStrategy | 28.54 ms | 32.56 ms | -12.35% | 35.05 ops/s | 30.76 ops/s | -12.26% |
| ChunkAppenderStrategy | 34.99 ms | 41.1 ms | -14.88% | 28.8 ops/s | 24.36 ops/s | -15.44% |
| RowAppenderStrategy | 169.61 ms | 130.34 ms | +30.13% | 6.41 ops/s | 7.7 ops/s | +20.14% |
| PreparedInsertStrategy | 201.02 ms | 141.57 ms | +42% | 5.27 ops/s | 7.09 ops/s | +34.67% |

## loader strategies: full supported schema, memory (count: 20000)

Source: `bench/loader-strategies.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| NativeChunkAppenderStrategy | 194.51 ms | 157.64 ms | +23.39% | 5.15 ops/s | 6.37 ops/s | +23.66% |
| ChunkAppenderStrategy | 210.93 ms | 184.21 ms | +14.5% | 4.76 ops/s | 5.44 ops/s | +14.38% |
| PreparedInsertStrategy | 787.66 ms | 660.06 ms | +19.33% | 1.29 ops/s | 1.52 ops/s | +17.9% |
| RowAppenderStrategy | 876.21 ms | 593.81 ms | +47.56% | 1.17 ops/s | 1.69 ops/s | +43.95% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.66 ms | 11.65 ms | +111.64% | 40.59 ops/s | 85.9 ops/s | +111.61% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 26.21 ms | 13.29 ms | +97.26% | 38.2 ops/s | 75.38 ops/s | +97.33% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.47 ms | 16.27 ms | +105.71% | 29.89 ops/s | 61.48 ops/s | +105.71% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 104.77 ms | 77.78 ms | +34.69% | 9.55 ops/s | 12.97 ops/s | +35.84% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 165.54 ms | 113.56 ms | +45.78% | 6.04 ops/s | 8.81 ops/s | +45.88% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 186.77 ms | 110.82 ms | +68.54% | 5.36 ops/s | 9.03 ops/s | +68.5% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 202.81 ms | 136.39 ms | +48.7% | 4.93 ops/s | 7.33 ops/s | +48.72% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.28 ms | 38.78 ms | -16.77% | 30.99 ops/s | 25.79 ops/s | -16.77% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 33.14 ms | 36.74 ms | -9.8% | 30.19 ops/s | 27.23 ops/s | -9.79% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 26.87 us | 8.6 us | +212.48% | 39,591.23 ops/s | 126,560.78 ops/s | +219.67% |
