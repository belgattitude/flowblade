# SQLDuck benchmarks

Generated with Vitest. Positive differences favor Bun: lower latency and higher
throughput.

| Environment | Value                           |
| ----------- | ------------------------------- |
| Node.js     | `v24.21.0`                      |
| Bun         | `1.4.3`                         |
| CPU         | Apple M5 Pro (18 logical cores) |
| RAM         | 24 GiB                          |

## appender benches

Source: `bench/appender.bench.ts`

| Benchmark                                                   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ----------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| duckdb appender memory, count: 100000, chunk size 2048      |          56.49 ms |         43.61 ms |                +29.54% |     17.71 ops/s |    22.94 ops/s |                   +29.55% |
| duckdb appender, count: 100000, chunk size 1024             |          57.06 ms |         43.68 ms |                +30.62% |     17.53 ops/s |    22.89 ops/s |                   +30.62% |
| duckdb appender file no wal, count: 100000, chunk size 1024 |          60.68 ms |         49.35 ms |                +22.95% |     16.49 ops/s |    20.26 ops/s |                   +22.89% |
| duckdb appender file no wal, count: 100000, chunk size 2048 |           62.4 ms |         48.38 ms |                +28.97% |     16.03 ops/s |    20.67 ops/s |                   +28.94% |
| duckdb appender file, count: 100000, chunk size 2048        |          66.05 ms |         54.47 ms |                +21.26% |     15.16 ops/s |    18.42 ops/s |                   +21.49% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark        | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from bigint      |           3.73 ms |           1.3 ms |                +186.9% |    267.85 ops/s |   769.13 ops/s |                  +187.15% |
| from Date        |           4.18 ms |          1.93 ms |               +116.43% |    239.55 ops/s |   521.25 ops/s |                  +117.59% |
| from number      |           4.61 ms |          1.69 ms |               +172.75% |    217.14 ops/s |   593.46 ops/s |                  +173.31% |
| from date string |           6.85 ms |          4.54 ms |                +50.75% |    146.12 ops/s |   220.86 ops/s |                   +51.15% |
| from ISO string  |           8.16 ms |          6.85 ms |                +19.03% |    122.59 ops/s |   145.97 ops/s |                   +19.08% |
| from SQL string  |            8.8 ms |          6.61 ms |                +33.03% |    113.71 ops/s |   151.82 ops/s |                   +33.51% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark        | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from Date        |           3.58 ms |          1.64 ms |               +118.08% |    279.31 ops/s |   611.79 ops/s |                  +119.03% |
| from date string |           5.59 ms |          4.49 ms |                +24.43% |    179.08 ops/s |   223.37 ops/s |                   +24.74% |
| from ISO string  |           5.62 ms |          4.56 ms |                +23.27% |    178.02 ops/s |   219.98 ops/s |                   +23.57% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ----------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from bigint |         501.33 us |        232.44 us |               +115.69% |  1,996.51 ops/s | 4,439.05 ops/s |                  +122.34% |
| from number |           1.31 ms |        642.04 us |               +104.19% |    763.35 ops/s | 1,565.82 ops/s |                  +105.12% |
| from string |           3.11 ms |          2.56 ms |                +21.45% |    322.31 ops/s |   391.75 ops/s |                   +21.55% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark                   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| toStringEnum from string    |         514.32 us |        195.69 us |               +162.83% |  1,948.17 ops/s | 5,133.46 ops/s |                   +163.5% |
| toDecimal(18,3) from number |           4.35 ms |          2.14 ms |               +103.44% |    229.94 ops/s |   469.58 ops/s |                  +104.22% |
| toUUID from string          |          12.43 ms |         10.17 ms |                +22.26% |     80.51 ops/s |    98.75 ops/s |                   +22.65% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark                                                              | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000)                  |          23.74 ms |         11.13 ms |               +113.25% |     42.16 ops/s |    89.98 ops/s |                  +113.42% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) |          25.19 ms |         12.51 ms |               +101.35% |     39.73 ops/s |    80.11 ops/s |                  +101.63% |
| mapFakeRowStream with chunkSize 2048 (count: 100000)                   |          33.73 ms |         15.16 ms |               +122.49% |     29.66 ops/s |       66 ops/s |                  +122.49% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark                                                                          | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------------------------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| full schema, no transformers, chunkSize 2048 (count: 100000)                       |         103.69 ms |         53.26 ms |                +94.66% |      9.65 ops/s |     18.8 ops/s |                   +94.83% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) |         161.23 ms |        110.29 ms |                +46.18% |       6.2 ops/s |     9.07 ops/s |                   +46.22% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000)          |          180.6 ms |        104.57 ms |                +72.71% |      5.54 ops/s |     9.57 ops/s |                   +72.73% |
| full schema, with all column converters, chunkSize 2048 (count: 100000)            |         197.42 ms |         115.4 ms |                +71.08% |      5.07 ops/s |     8.69 ops/s |                   +71.55% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark                                                   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ----------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) |          35.17 ms |         20.87 ms |                +68.57% |     28.45 ops/s |    47.94 ops/s |                   +68.49% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000)  |          36.08 ms |         22.52 ms |                +60.18% |     27.73 ops/s |    44.42 ops/s |                   +60.18% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark             | Node mean latency | Bun mean latency | Bun latency difference | Node throughput |  Bun throughput | Bun throughput difference |
| --------------------- | ----------------: | ---------------: | ---------------------: | --------------: | --------------: | ------------------------: |
| getTableCreateFromZod |          15.78 us |          7.86 us |               +100.89% | 64,300.38 ops/s | 134,557.1 ops/s |                  +109.26% |
