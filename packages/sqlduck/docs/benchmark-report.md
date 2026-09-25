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
| duckdb appender, count: 100000, chunk size 1024 | 62.67 ms | 53.85 ms | +16.38% | 15.96 ops/s | 18.63 ops/s | +16.73% |
| duckdb appender memory, count: 100000, chunk size 2048 | 64.29 ms | 51.39 ms | +25.09% | 15.57 ops/s | 19.49 ops/s | +25.18% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 67.44 ms | 54.06 ms | +24.75% | 14.83 ops/s | 18.51 ops/s | +24.79% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 67.93 ms | 56 ms | +21.3% | 14.72 ops/s | 17.87 ops/s | +21.4% |
| duckdb appender file, count: 100000, chunk size 2048 | 71.88 ms | 59.57 ms | +20.67% | 13.91 ops/s | 16.83 ops/s | +20.95% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.26 ms | 11.61 ms | +100.25% | 43.02 ops/s | 86.3 ops/s | +100.62% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.52 ms | 12.86 ms | +90.59% | 40.81 ops/s | 77.82 ops/s | +90.68% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.03 ms | 15.73 ms | +103.64% | 31.23 ops/s | 63.63 ops/s | +103.7% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 100.98 ms | 48.67 ms | +107.48% | 9.91 ops/s | 20.57 ops/s | +107.6% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 217.2 ms | 111.92 ms | +94.07% | 4.61 ops/s | 8.95 ops/s | +94.25% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 16.69 us | 8.94 us | +86.77% | 61,417.63 ops/s | 119,871.08 ops/s | +95.17% |
