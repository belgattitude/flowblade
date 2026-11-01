# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.4`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender, count: 100000, chunk size 1024 | 56.03 ms | 44.09 ms | +27.06% | 17.85 ops/s | 22.68 ops/s | +27.04% |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.17 ms | 45.66 ms | +23.02% | 17.8 ops/s | 21.9 ops/s | +23.02% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 63.34 ms | 51.41 ms | +23.22% | 15.79 ops/s | 19.46 ops/s | +23.23% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.41 ms | 51.61 ms | +22.87% | 15.77 ops/s | 19.38 ops/s | +22.87% |
| duckdb appender file, count: 100000, chunk size 2048 | 67.48 ms | 57.03 ms | +18.34% | 14.82 ops/s | 17.54 ops/s | +18.35% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.43 ms | 1.25 ms | +174.12% | 291.96 ops/s | 800.63 ops/s | +174.23% |
| from Date | 4.16 ms | 1.64 ms | +152.86% | 240.82 ops/s | 609.49 ops/s | +153.09% |
| from number | 4.26 ms | 1.59 ms | +167.08% | 234.99 ops/s | 628.14 ops/s | +167.31% |
| from date string | 6.25 ms | 4.34 ms | +43.84% | 160.13 ops/s | 230.34 ops/s | +43.84% |
| from ISO string | 7.98 ms | 6.83 ms | +16.74% | 125.37 ops/s | 146.43 ops/s | +16.79% |
| from SQL string | 8.37 ms | 6.45 ms | +29.74% | 119.51 ops/s | 155.05 ops/s | +29.74% |

## DuckValueConverter.toTimestamp, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from number | 4.8 ms | 2.42 ms | +98.52% | 208.51 ops/s | 414.22 ops/s | +98.66% |
| from Date | 4.82 ms | 2.52 ms | +91.55% | 207.5 ops/s | 397.7 ops/s | +91.66% |
| from ISO string | 8.43 ms | 7.5 ms | +12.5% | 118.6 ops/s | 133.42 ops/s | +12.49% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.55 ms | 1.61 ms | +121.07% | 281.85 ops/s | 623.35 ops/s | +121.16% |
| from date string | 5.67 ms | 4.35 ms | +30.36% | 176.79 ops/s | 230.4 ops/s | +30.33% |
| from ISO string | 5.69 ms | 4.27 ms | +33.45% | 175.78 ops/s | 234.42 ops/s | +33.36% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 505.17 us | 228.85 us | +120.74% | 1,981.95 ops/s | 4,378.91 ops/s | +120.94% |
| from number | 1.33 ms | 630.15 us | +110.94% | 753.74 ops/s | 1,590.86 ops/s | +111.06% |
| from string | 3.1 ms | 2.77 ms | +11.91% | 322.88 ops/s | 362.9 ops/s | +12.4% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 511.99 us | 265.38 us | +92.93% | 1,955.89 ops/s | 3,771.12 ops/s | +92.81% |
| toDecimal(18,3) from number | 4.51 ms | 2.09 ms | +115.53% | 222.05 ops/s | 478.85 ops/s | +115.65% |
| toUUID from string | 11.98 ms | 9.89 ms | +21.12% | 83.49 ops/s | 101.17 ops/s | +21.18% |

## loader profile: memory (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| memory: recommended (optimistic write off, no checkpoint) | 386.21 ms | 398.66 ms | -3.12% | 2.59 ops/s | 2.51 ops/s | -3.12% |
| memory: defaults | 394.29 ms | 396.7 ms | -0.61% | 2.54 ops/s | 2.52 ops/s | -0.62% |

## loader profile: local disk (count: 1000000)

Source: `bench/loader-profiles.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| disk: defaults (recommended) | 433.33 ms | 451.05 ms | -3.93% | 2.31 ops/s | 2.22 ops/s | -3.93% |
| disk: periodic checkpoint (everyRows 204_800) | 437.26 ms | 451.8 ms | -3.22% | 2.29 ops/s | 2.21 ops/s | -3.22% |
| disk: optimistic write off | 455.87 ms | 448.17 ms | +1.72% | 2.2 ops/s | 2.23 ops/s | +1.46% |
| disk: small flushes (flushEveryRows 20_480, WAL path) | 478.11 ms | 498.33 ms | -4.06% | 2.09 ops/s | 2.01 ops/s | -4.05% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.49 ms | 11.3 ms | +107.79% | 42.61 ops/s | 88.52 ops/s | +107.75% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.73 ms | 12.89 ms | +91.92% | 40.45 ops/s | 77.72 ops/s | +92.13% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.86 ms | 15.45 ms | +106.24% | 31.39 ops/s | 64.74 ops/s | +106.22% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 104.04 ms | 68.97 ms | +50.85% | 9.62 ops/s | 14.51 ops/s | +50.94% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 159.86 ms | 110.26 ms | +44.98% | 6.26 ops/s | 9.07 ops/s | +45% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 179.45 ms | 103.44 ms | +73.48% | 5.57 ops/s | 9.67 ops/s | +73.47% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 198.44 ms | 130.7 ms | +51.83% | 5.04 ops/s | 7.65 ops/s | +51.81% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.21 ms | 38.02 ms | -15.28% | 31.05 ops/s | 26.33 ops/s | -15.23% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 32.38 ms | 35.14 ms | -7.85% | 30.9 ops/s | 28.47 ops/s | -7.87% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.1 us | 8.14 us | +97.89% | 62,949.68 ops/s | 133,855.12 ops/s | +112.64% |
