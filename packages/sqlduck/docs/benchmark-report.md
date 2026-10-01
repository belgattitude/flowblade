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
| duckdb appender memory, count: 100000, chunk size 2048 | 56.81 ms | 45.61 ms | +24.57% | 17.61 ops/s | 21.94 ops/s | +24.6% |
| duckdb appender, count: 100000, chunk size 1024 | 58.59 ms | 45.74 ms | +28.11% | 17.16 ops/s | 21.87 ops/s | +27.45% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 62.09 ms | 53.04 ms | +17.06% | 16.12 ops/s | 18.87 ops/s | +17.11% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 64.32 ms | 51.66 ms | +24.51% | 15.58 ops/s | 19.42 ops/s | +24.58% |
| duckdb appender file, count: 100000, chunk size 2048 | 75.38 ms | 54.24 ms | +38.98% | 13.68 ops/s | 18.44 ops/s | +34.79% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.83 ms | 1.35 ms | +184.17% | 261.29 ops/s | 743.18 ops/s | +184.43% |
| from Date | 4.09 ms | 1.89 ms | +116.97% | 244.75 ops/s | 531.39 ops/s | +117.12% |
| from number | 4.6 ms | 1.72 ms | +166.93% | 217.61 ops/s | 581.46 ops/s | +167.2% |
| from date string | 6.27 ms | 4.49 ms | +39.75% | 159.42 ops/s | 222.81 ops/s | +39.76% |
| from ISO string | 7.68 ms | 6.95 ms | +10.49% | 130.22 ops/s | 143.94 ops/s | +10.53% |
| from SQL string | 8.25 ms | 6.45 ms | +27.82% | 121.29 ops/s | 155.05 ops/s | +27.83% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.63 ms | 1.64 ms | +120.96% | 275.61 ops/s | 609.05 ops/s | +120.98% |
| from date string | 5.65 ms | 4.37 ms | +29.32% | 177.1 ops/s | 229.01 ops/s | +29.31% |
| from ISO string | 5.7 ms | 4.31 ms | +32.19% | 175.66 ops/s | 232.09 ops/s | +32.13% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 506.85 us | 227.1 us | +123.18% | 1,975.7 ops/s | 4,411.51 ops/s | +123.29% |
| from number | 1.33 ms | 630.57 us | +111.47% | 750.73 ops/s | 1,591.83 ops/s | +112.04% |
| from string | 3.13 ms | 2.53 ms | +23.6% | 319.62 ops/s | 395.12 ops/s | +23.62% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 513.84 us | 228.4 us | +124.97% | 1,949.44 ops/s | 4,392.08 ops/s | +125.3% |
| toDecimal(18,3) from number | 4.33 ms | 2.1 ms | +105.9% | 231.19 ops/s | 476.32 ops/s | +106.03% |
| toUUID from string | 12.34 ms | 9.99 ms | +23.57% | 81.07 ops/s | 100.21 ops/s | +23.61% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.33 ms | 11.58 ms | +101.44% | 42.92 ops/s | 86.41 ops/s | +101.32% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.58 ms | 13.09 ms | +87.78% | 40.72 ops/s | 76.52 ops/s | +87.91% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 31.84 ms | 16 ms | +99.06% | 31.42 ops/s | 62.54 ops/s | +99.04% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 99.68 ms | 51.35 ms | +94.09% | 10.04 ops/s | 19.48 ops/s | +94.04% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 153.9 ms | 116.64 ms | +31.95% | 6.5 ops/s | 8.59 ops/s | +32.18% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 173.24 ms | 101.63 ms | +70.45% | 5.78 ops/s | 9.84 ops/s | +70.36% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 194.17 ms | 110.43 ms | +75.83% | 5.15 ops/s | 9.06 ops/s | +75.77% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 32.71 ms | 22.98 ms | +42.33% | 30.61 ops/s | 43.56 ops/s | +42.31% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 32.72 ms | 24.82 ms | +31.83% | 30.59 ops/s | 40.31 ops/s | +31.78% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.97 us | 8.71 us | +83.32% | 63,680.2 ops/s | 120,980.28 ops/s | +89.98% |
