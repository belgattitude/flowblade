---
"@flowblade/sqlduck": minor
---

Add an experimental `NativeChunkAppenderStrategy` (from `@flowblade/sqlduck/loader`): same as `ChunkAppenderStrategy`, but data chunks are written directly in the native DuckDB vectors (typed arrays and bulk copies) instead of node-api per item vectors, up to ~18% faster on a 1M rows load of simple columns (~4% on a wide schema with lists, enums and decimals). Columns of a type not handled (ie: HUGEINT, BIGNUM, DECIMAL widths other than 10-18), or every column when the bindings used by `@duckdb/node-api` can't be loaded, are written by node-api. An invalid value is reported with the name of its column (ie: `Column 'age' - number out of int32 range`). It relies on `@duckdb/node-bindings` internals, so it stays opt-in.
