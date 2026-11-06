---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": patch
---

Add savepoints, the `onFailedQuery` option and a default transaction datasource type.

- `@flowblade/source-kysely`: `tx.savepoint()` / `tx.savepointOrThrow()`, a part of the transaction rolled back alone (when the callback throws or a query failed in it, unless `onFailedQuery` is "commit": the savepoint is then released), the transaction goes on. `tx.savepointOrThrow()` rethrows after rolling back the savepoint: catch the error for the transaction to go on. Nested savepoints are supported, SQL Server savepoints end with the transaction (no RELEASE).
- New `onFailedQuery: "rollback" | "commit"` transaction option: "commit" commits after a failed query handled by the callback, for SQL Server or MySQL (a conflict is never committed). Not available on DuckDB, which always aborts the transaction on a failed query.
- `@flowblade/core`: `TransactionalDatasourceInterface` defaults its transaction datasource to the new `TransactionDatasourceInterface`, add `TransactionSavepointInterface`, `runSavepoint()` and the `savepoint` span (`QMetaSavepointSpan`).
