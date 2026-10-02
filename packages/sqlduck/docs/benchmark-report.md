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
| duckdb appender, count: 100000, chunk size 1024 | 56.09 ms | 44.98 ms | +24.69% | 17.84 ops/s | 22.23 ops/s | +24.6% |
| duckdb appender memory, count: 100000, chunk size 2048 | 56.19 ms | 44.63 ms | +25.9% | 17.8 ops/s | 22.41 ops/s | +25.9% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 62.33 ms | 49.68 ms | +25.47% | 16.07 ops/s | 20.14 ops/s | +25.29% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 63.01 ms | 50.52 ms | +24.73% | 15.88 ops/s | 19.8 ops/s | +24.69% |
| duckdb appender file, count: 100000, chunk size 2048 | 64.11 ms | 53.56 ms | +19.68% | 15.6 ops/s | 18.67 ops/s | +19.67% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 3.76 ms | 1.32 ms | +186.22% | 265.78 ops/s | 761.04 ops/s | +186.34% |
| from Date | 4.03 ms | 1.85 ms | +117.49% | 248.33 ops/s | 539.96 ops/s | +117.43% |
| from number | 4.73 ms | 1.68 ms | +180.85% | 211.48 ops/s | 594.37 ops/s | +181.05% |
| from date string | 6.32 ms | 4.55 ms | +38.99% | 158.24 ops/s | 220.07 ops/s | +39.08% |
| from ISO string | 7.78 ms | 6.93 ms | +12.26% | 128.68 ops/s | 144.33 ops/s | +12.16% |
| from SQL string | 8.24 ms | 6.55 ms | +25.9% | 121.35 ops/s | 152.78 ops/s | +25.89% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from Date | 3.83 ms | 1.61 ms | +137.23% | 261.84 ops/s | 620.52 ops/s | +136.99% |
| from ISO string | 5.69 ms | 4.38 ms | +29.98% | 175.69 ops/s | 228.36 ops/s | +29.98% |
| from date string | 5.7 ms | 4.36 ms | +30.84% | 175.52 ops/s | 229.66 ops/s | +30.85% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| from bigint | 507.85 us | 223.21 us | +127.52% | 1,974.77 ops/s | 4,486.19 ops/s | +127.18% |
| from number | 1.33 ms | 636.52 us | +108.91% | 752.66 ops/s | 1,578.52 ops/s | +109.73% |
| from string | 3.04 ms | 2.54 ms | +19.8% | 329.37 ops/s | 394.73 ops/s | +19.84% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| toStringEnum from string | 509.87 us | 244.37 us | +108.65% | 1,964.42 ops/s | 4,098.71 ops/s | +108.65% |
| toDecimal(18,3) from number | 4.44 ms | 2.07 ms | +114.37% | 225.19 ops/s | 483.19 ops/s | +114.57% |
| toUUID from string | 11.96 ms | 9.7 ms | +23.35% | 83.59 ops/s | 103.19 ops/s | +23.45% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.26 ms | 11.42 ms | +112.33% | 41.24 ops/s | 87.61 ops/s | +112.44% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.14 ms | 13.03 ms | +92.97% | 39.81 ops/s | 76.89 ops/s | +93.17% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 34.23 ms | 16.1 ms | +112.6% | 29.27 ops/s | 62.12 ops/s | +112.24% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 98 ms | 50.96 ms | +92.3% | 10.21 ops/s | 19.65 ops/s | +92.46% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) | 152.01 ms | 117.82 ms | +29.01% | 6.58 ops/s | 8.53 ops/s | +29.59% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000) | 168.56 ms | 103.73 ms | +62.5% | 5.93 ops/s | 9.65 ops/s | +62.55% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 189.22 ms | 114.06 ms | +65.9% | 5.29 ops/s | 8.77 ops/s | +65.8% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| 26 columns, sync generator, chunkSize 2048 (count: 100000) | 30.86 ms | 23.32 ms | +32.34% | 32.44 ops/s | 42.94 ops/s | +32.38% |
| 26 columns, async generator, chunkSize 2048 (count: 100000) | 30.92 ms | 21.57 ms | +43.36% | 32.4 ops/s | 46.43 ops/s | +43.29% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.07 us | 8.58 us | +87.35% | 63,239.36 ops/s | 123,954.46 ops/s | +96.01% |
