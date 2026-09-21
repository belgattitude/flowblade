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
| duckdb appender memory, count: 100000, chunk size 2048 | 64.74 ms | 48.69 ms | +32.99% | 15.45 ops/s | 20.56 ops/s | +33.1% |
| duckdb appender, count: 100000, chunk size 1024 | 64.97 ms | 49.94 ms | +30.08% | 15.39 ops/s | 20.02 ops/s | +30.09% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 70.06 ms | 53.49 ms | +30.98% | 14.27 ops/s | 18.7 ops/s | +31% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 71.08 ms | 55.02 ms | +29.19% | 14.07 ops/s | 18.18 ops/s | +29.17% |
| duckdb appender file, count: 100000, chunk size 2048 | 73.97 ms | 57.5 ms | +28.64% | 13.52 ops/s | 17.39 ops/s | +28.66% |
## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 24.24 ms | 12.08 ms | +100.57% | 41.28 ops/s | 82.81 ops/s | +100.61% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 25.57 ms | 14.16 ms | +80.57% | 39.12 ops/s | 70.66 ops/s | +80.63% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 33.63 ms | 16.65 ms | +101.97% | 29.74 ops/s | 60.07 ops/s | +101.98% |
## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| getTableCreateFromZod | 15.81 us | 8.66 us | +82.46% | 63,906.6 ops/s | 122,473.3 ops/s | +91.64% |
