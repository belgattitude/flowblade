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
| duckdb appender memory, count: 100000, chunk size 2048 | 63.91 ms | 49.01 ms | +30.41% | 15.65 ops/s | 20.41 ops/s | +30.43% |
| duckdb appender, count: 100000, chunk size 1024 | 66.67 ms | 51.01 ms | +30.71% | 15.02 ops/s | 19.61 ops/s | +30.54% |
| duckdb appender file no wal, count: 100000, chunk size 2048 | 68.68 ms | 53.59 ms | +28.14% | 14.56 ops/s | 18.66 ops/s | +28.12% |
| duckdb appender file no wal, count: 100000, chunk size 1024 | 73.07 ms | 56.41 ms | +29.52% | 13.78 ops/s | 17.73 ops/s | +28.73% |
| duckdb appender file, count: 100000, chunk size 2048 | 73.19 ms | 58.07 ms | +26.05% | 13.67 ops/s | 17.23 ops/s | +26.06% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000) | 23.29 ms | 11.39 ms | +104.42% | 42.96 ops/s | 87.97 ops/s | +104.76% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) | 24.62 ms | 12.73 ms | +93.42% | 40.66 ops/s | 78.65 ops/s | +93.44% |
| mapFakeRowStream with chunkSize 2048 (count: 100000) | 32.12 ms | 15.58 ms | +106.16% | 31.15 ops/s | 64.22 ops/s | +106.17% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| full schema, no transformers, chunkSize 2048 (count: 100000) | 98.43 ms | 48.69 ms | +102.17% | 10.16 ops/s | 20.54 ops/s | +102.12% |
| full schema, with all column converters, chunkSize 2048 (count: 100000) | 213.88 ms | 106.85 ms | +100.16% | 4.68 ops/s | 9.36 ops/s | +100.17% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --- | --: | --: | --: | --: | --: | --: |
| getTableCreateFromZod | 15.64 us | 8.6 us | +81.8% | 64,617.56 ops/s | 122,828.13 ops/s | +90.08% |
