---
"@flowblade/core": patch
"@flowblade/source-kysely": patch
"@flowblade/source-duckdb": minor
"@flowblade/sqlduck": patch
---

Transaction fixes.

- `@flowblade/core`: an aborted transaction no longer waits for `begin` (ie: a connection of an exhausted pool, a lock): it returns "ABORTED" at once, a transaction begun after the abort is rolled back and the callback never runs.
- `@flowblade/source-kysely`: `tx.stream()` runs in the transaction even with a query built with `ds.queryBuilder` (it used the builder connection, outside the transaction).
- `@flowblade/source-duckdb`: only the known DuckDB conflict messages are reported as "TRANSACTION_CONFLICT" (not a constraint violation on a key containing "conflict"), the connection lock is released even when closing a stream fails. Add `isInConnectionTransaction(conn)`.
- `@flowblade/sqlduck`: the loads run in a `DuckdbDatasource` transaction callback skip their checkpoints (DuckDB can't checkpoint in a transaction, the transaction failed).
