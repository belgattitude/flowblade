---
"@flowblade/source-duckdb": patch
---

An aborted `query()` or `stream()` always reports the abort reason (ie: `AbortError`, `TimeoutError`) as error `cause`.

With `@duckdb/node-api` 1.5.6-r.2, the interrupt can make DuckDB fail before the abort check, the cause was then the DuckDB `INTERRUPT` error. The error message is unchanged, non-abort failures still keep the DuckDB error as `cause`.
