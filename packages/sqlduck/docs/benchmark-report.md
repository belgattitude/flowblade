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
| duckdb appender, count: 100000, chunk size 1024             |          55.71 ms |         46.32 ms |                +20.28% |     17.95 ops/s |    21.59 ops/s |                   +20.28% |
| duckdb appender memory, count: 100000, chunk size 2048      |          55.91 ms |         44.67 ms |                +25.17% |     17.89 ops/s |    22.39 ops/s |                   +25.17% |
| duckdb appender file no wal, count: 100000, chunk size 1024 |          61.25 ms |         51.49 ms |                +18.97% |     16.33 ops/s |    19.44 ops/s |                   +19.03% |
| duckdb appender file no wal, count: 100000, chunk size 2048 |          61.58 ms |         49.92 ms |                +23.36% |     16.25 ops/s |    20.03 ops/s |                   +23.32% |
| duckdb appender file, count: 100000, chunk size 2048        |          65.16 ms |         53.42 ms |                +21.99% |     15.35 ops/s |    18.72 ops/s |                   +21.98% |

## DuckValueConverter.toTimestampMs, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark        | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from bigint      |           3.84 ms |          1.31 ms |               +192.18% |    260.69 ops/s |   762.49 ops/s |                  +192.49% |
| from Date        |           4.32 ms |          1.75 ms |                +146.2% |    232.05 ops/s |   570.73 ops/s |                  +145.95% |
| from number      |           4.71 ms |          1.72 ms |               +174.39% |    212.37 ops/s |   583.71 ops/s |                  +174.86% |
| from date string |           6.96 ms |          4.53 ms |                +53.69% |    143.71 ops/s |   220.98 ops/s |                   +53.76% |
| from ISO string  |           8.29 ms |          6.78 ms |                +22.39% |     120.6 ops/s |    147.6 ops/s |                   +22.39% |
| from SQL string  |           8.83 ms |          6.49 ms |                +36.05% |    113.27 ops/s |   154.15 ops/s |                   +36.09% |

## DuckValueConverter.toDate, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark        | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from Date        |           3.68 ms |          1.62 ms |               +127.34% |    272.39 ops/s |    619.4 ops/s |                  +127.39% |
| from date string |           5.82 ms |          4.37 ms |                +33.09% |    172.27 ops/s |   228.91 ops/s |                   +32.88% |
| from ISO string  |           6.14 ms |          4.43 ms |                +38.59% |    163.58 ops/s |   225.96 ops/s |                   +38.13% |

## DuckValueConverter.toBigInt, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ----------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| from bigint |         517.19 us |        211.55 us |               +144.48% |  1,939.89 ops/s | 4,743.17 ops/s |                  +144.51% |
| from number |           1.34 ms |        626.21 us |               +113.84% |    747.59 ops/s | 1,602.61 ops/s |                  +114.37% |
| from string |           3.14 ms |          2.55 ms |                +23.05% |    318.65 ops/s |   392.41 ops/s |                   +23.15% |

## DuckValueConverter misc, count: 100000

Source: `bench/duck-value-converter.bench.ts`

| Benchmark                   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| --------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| toStringEnum from string    |         510.99 us |        264.84 us |                +92.94% |  1,959.69 ops/s | 3,781.96 ops/s |                   +92.99% |
| toDecimal(18,3) from number |           4.31 ms |          2.05 ms |               +109.85% |    232.24 ops/s |   487.82 ops/s |                  +110.05% |
| toUUID from string          |          12.27 ms |          9.91 ms |                +23.74% |     81.65 ops/s |   100.98 ops/s |                   +23.68% |

## Bench rowsToColumnsChunks

Source: `bench/stream.bench.ts`

| Benchmark                                                              | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| rowToColumnsChunk with chunkSize 2048 (count: 100000)                  |          23.39 ms |         11.05 ms |               +111.75% |     42.78 ops/s |    90.62 ops/s |                  +111.81% |
| rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) |          24.33 ms |         12.39 ms |                 +96.4% |     41.13 ops/s |    80.83 ops/s |                   +96.53% |
| mapFakeRowStream with chunkSize 2048 (count: 100000)                   |          32.42 ms |         15.21 ms |               +113.23% |     30.86 ops/s |     65.8 ops/s |                  +113.18% |

## Bench rowsToColumnsChunks with full supported-columns schema

Source: `bench/stream.bench.ts`

| Benchmark                                                                          | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ---------------------------------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| full schema, no transformers, chunkSize 2048 (count: 100000)                       |         100.17 ms |         52.73 ms |                +89.95% |      9.99 ops/s |    18.99 ops/s |                   +90.12% |
| full schema, rowsToConvertedColumnsChunks compiled, chunkSize 2048 (count: 100000) |         159.43 ms |        111.24 ms |                +43.32% |      6.27 ops/s |     8.99 ops/s |                   +43.34% |
| full schema, rowsToConvertedColumnsChunks, chunkSize 2048 (count: 100000)          |         176.78 ms |        104.02 ms |                +69.94% |      5.66 ops/s |     9.62 ops/s |                      +70% |
| full schema, with all column converters, chunkSize 2048 (count: 100000)            |         192.47 ms |           116 ms |                +65.93% |       5.2 ops/s |     8.64 ops/s |                   +66.24% |

## Bench rowsToColumnsChunks with pre-generated rows

Source: `bench/stream.bench.ts`

| Benchmark                                                   | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |
| ----------------------------------------------------------- | ----------------: | ---------------: | ---------------------: | --------------: | -------------: | ------------------------: |
| 26 columns, async generator, chunkSize 2048 (count: 100000) |          35.21 ms |         21.04 ms |                +67.32% |     28.41 ops/s |    47.54 ops/s |                   +67.35% |
| 26 columns, sync generator, chunkSize 2048 (count: 100000)  |          35.98 ms |         22.64 ms |                +58.88% |     27.81 ops/s |    44.19 ops/s |                   +58.89% |

## Bench getTableCreateFromZod

Source: `bench/table-create.bench.ts`

| Benchmark             | Node mean latency | Bun mean latency | Bun latency difference | Node throughput |   Bun throughput | Bun throughput difference |
| --------------------- | ----------------: | ---------------: | ---------------------: | --------------: | ---------------: | ------------------------: |
| getTableCreateFromZod |          15.87 us |          8.36 us |                +89.84% | 63,833.55 ops/s | 128,830.53 ops/s |                  +101.82% |
