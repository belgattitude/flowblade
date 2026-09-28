# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.2`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| duckdb appender memory, count: 100000, chunk size 2048 | 62.07 ms | 48.32 ms | +28.47% | 16.11 ops/s | 20.7 ops/s | +28.51% |
| duckdb appender, count: 100000, chunk size 1024 | 63.07 ms | 50.97 ms | +23.74% | 15.88 ops/s | 19.64 ops/s | +23.7% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 66.72 ms | 53.62 ms | +24.43% | 14.99 ops/s | 18.66 ops/s | +24.46% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 66.96 ms | 55.09 ms | +21.54% | 14.94 ops/s | 18.16 ops/s | +21.55% |
| duckdb appender file, count: 100000, chunk size 2048 | 71.19 ms | 57.78 ms | +23.21% | 14.05 ops/s | 17.31 ops/s | +23.22% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.51 ms | 11.65 ms | +101.82% | 42.55 ops/s | 86.02 ops/s | +102.14% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.42 ms | 12.84 ms | +90.2% | 40.97 ops/s | 77.96 ops/s | +90.29% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.22 ms | 15.7 ms | +105.22% | 31.05 ops/s | 63.72 ops/s | +105.25% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 97.34 ms | 48.52 ms | +100.61% | 10.28 ops/s | 20.61 ops/s | +100.61% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 212.92 ms | 106.87 ms | +99.24% | 4.7 ops/s | 9.36 ops/s | +99.26% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.7 us | 8.54 us | +83.8% | 64,364.24 ops/s | 123,721.87 ops/s | +92.22% |
