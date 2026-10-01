---
"@flowblade/sqlduck": patch
---

Fix toTable failing on UUID columns and on BIGINT[] (or other converted type) list columns

- `DuckValueConverter.toUUID` now returns a `DuckDBUUIDValue` instead of a bigint
- List items are converted according to the list value type (ie: numbers or strings to bigint for BIGINT[])
