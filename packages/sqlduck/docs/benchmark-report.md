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
| duckdb appender memory, count: 100000, chunk size 2048 | 61.39 ms | 47.22 ms | +30.03% | 16.29 ops/s | 21.18 ops/s | +30.04% |
| duckdb appender, count: 100000, chunk size 1024 | 61.62 ms | 49.74 ms | +23.89% | 16.23 ops/s | 20.13 ops/s | +24.02% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 66.32 ms | 52.47 ms | +26.4% | 15.08 ops/s | 19.06 ops/s | +26.4% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 66.97 ms | 54.17 ms | +23.61% | 14.93 ops/s | 18.46 ops/s | +23.62% |
| duckdb appender file, count: 100000, chunk size 2048 | 70.58 ms | 56.64 ms | +24.6% | 14.17 ops/s | 17.66 ops/s | +24.6% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.96 ms | 11.15 ms | +114.93% | 41.76 ops/s | 89.82 ops/s | +115.09% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.94 ms | 12.56 ms | +98.52% | 40.11 ops/s | 79.75 ops/s | +98.83% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.72 ms | 15.27 ms | +114.26% | 30.57 ops/s | 65.49 ops/s | +114.27% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 99.72 ms | 49.24 ms | +102.51% | 10.03 ops/s | 20.31 ops/s | +102.47% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 217.17 ms | 106.76 ms | +103.41% | 4.61 ops/s | 9.37 ops/s | +103.41% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.55 us | 8.33 us | +86.7% | 64,991.61 ops/s | 126,748.96 ops/s | +95.02% |
