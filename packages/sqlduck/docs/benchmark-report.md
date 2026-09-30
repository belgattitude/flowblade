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
| duckdb appender, count: 100000, chunk size 1024 | 61.97 ms | 49.16 ms | +26.06% | 16.14 ops/s | 20.34 ops/s | +26.03% |
| duckdb appender memory, count: 100000, chunk size 2048 | 62.12 ms | 47.65 ms | +30.36% | 16.1 ops/s | 20.99 ops/s | +30.38% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 66.19 ms | 52.93 ms | +25.06% | 15.11 ops/s | 18.89 ops/s | +25.05% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 67.26 ms | 54.77 ms | +22.81% | 14.87 ops/s | 18.26 ops/s | +22.78% |
| duckdb appender file, count: 100000, chunk size 2048 | 78.5 ms | 58.25 ms | +34.77% | 12.92 ops/s | 17.19 ops/s | +33.02% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.57 ms | 11.18 ms | +110.8% | 42.44 ops/s | 89.54 ops/s | +110.95% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.64 ms | 12.48 ms | +97.46% | 40.61 ops/s | 80.25 ops/s | +97.61% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.27 ms | 15.47 ms | +108.63% | 30.99 ops/s | 64.66 ops/s | +108.63% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 101.04 ms | 48.78 ms | +107.13% | 9.9 ops/s | 20.5 ops/s | +107.05% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 215.51 ms | 105.84 ms | +103.62% | 4.64 ops/s | 9.45 ops/s | +103.63% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.88 us | 8.4 us | +89.04% | 63,764.9 ops/s | 125,610.97 ops/s | +96.99% |
