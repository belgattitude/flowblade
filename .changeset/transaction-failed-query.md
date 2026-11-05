---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": patch
---

A failed query in a transaction is never committed, even when handled by the callback (ie: `tx.query()` never throws, or a caught `tx.queryOrThrow()`): the transaction is rolled back with a `TRANSACTION_FAILED` error, the first query error as `cause`.

Most databases abort the transaction on error and silently roll back on commit (ie: Postgres, DuckDB), the transaction would otherwise be reported as committed.

`runTransaction()` handles it for all the datasources: `begin` receives a `TransactionBeginContext` with `onQueryFailed()`, to call (like `addSpan()`) for each failed query of the transaction datasource.
