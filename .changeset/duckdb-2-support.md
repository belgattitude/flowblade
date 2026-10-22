---
"@flowblade/source-duckdb": minor
"@flowblade/sqlduck": minor
---

Support `@duckdb/node-api` 2.0, peer dependency is now `^1.5.6-r.1 || ^2.0.0-r.1`.

- source-duckdb: `stream()` closes the DuckDB result when the stream is left early (break / return / failure). Since DuckDB 2.0, an unfinished streaming result blocks the connection from running another query.
- sqlduck: `attachOrReplace()` with `runDetachIfAttachOrReplaceFailWithAlreadyAttached` recognizes the DuckDB 2.0 "Unique file handle conflict" error, now reported as `Resource In Use Error` instead of `Binder Error`.
- sqlduck: the `TIMESTAMP_TZ_NS` type added in DuckDB 2.0 is reported as unsupported by the column converters.
