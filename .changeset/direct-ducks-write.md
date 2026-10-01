---
"@flowblade/sqlduck": patch
---

Faster `toTable` (~16-24%): data chunks are now written directly in the native DuckDB vectors (typed arrays and bulk copies) instead of node-api per item vectors. Types not handled (ie: HUGEINT, BIGNUM, small DECIMAL widths) still go through node-api, and everything does if the bindings used by `@duckdb/node-api` can't be loaded.
