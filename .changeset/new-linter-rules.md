---
"@flowblade/core": patch
"@flowblade/source-duckdb": patch
"@flowblade/source-kysely": patch
"@flowblade/sql-tag": patch
"@flowblade/sql-tag-format": patch
"@flowblade/sqlduck": patch
---

Apply the new shared lint rules (no non-null assertions, no explicit any, exhaustive switches, unused vars...).

- `QResult.map` on a success result without rows now returns the error `"mapper: no rows to map"` (was a `TypeError` message).
- `queryOrThrow` in `source-duckdb` and `source-kysely` now relies on `QResult.getOrThrow`, error message is unchanged.
- `sqlduck`: `rowsToColumnsChunks` iterates keys with `for...of`, measured ~7% faster on wide (26 columns) rows.
