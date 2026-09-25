# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.

| Environment | Value |
| --- | --- |
| Node.js | `v24.21.0` |
| Bun | `1.4.2` |
| CPU | Apple M5 Pro (18 logical cores) |
| RAM | 24 GiB |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| duckdb appender memory, count: 100000, chunk size 2048 | 61.6 ms | 50.36 ms | +22.32% | 16.24 ops/s | 19.95 ops/s | +22.85% |
| duckdb appender, count: 100000, chunk size 1024 | 61.94 ms | 50.62 ms | +22.37% | 16.15 ops/s | 19.76 ops/s | +22.4% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 66.84 ms | 52.97 ms | +26.18% | 14.96 ops/s | 18.88 ops/s | +26.17% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 68.71 ms | 54.39 ms | +26.34% | 14.56 ops/s | 18.39 ops/s | +26.29% |
| duckdb appender file, count: 100000, chunk size 2048 | 70.26 ms | 57.96 ms | +21.23% | 14.23 ops/s | 17.26 ops/s | +21.25% |
## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.61 ms | 11.44 ms | +106.38% | 42.38 ops/s | 87.53 ops/s | +106.53% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.77 ms | 12.88 ms | +92.25% | 40.39 ops/s | 77.84 ops/s | +92.73% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.64 ms | 16.08 ms | +102.99% | 30.65 ops/s | 62.25 ops/s | +103.14% |
## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| getTableCreateFromZod | 15.62 us | 9.17 us | +70.24% | 64,914.62 ops/s | 118,044.31 ops/s | +81.85% |
