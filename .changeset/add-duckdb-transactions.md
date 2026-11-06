---
"@flowblade/source-duckdb": minor
"@flowblade/core": patch
---

Add DuckDB transactions: `transaction()` (returns a QResult) and `transactionOrThrow()`, like the Kysely datasource.

- The transaction holds the connection: the queries and streams of the datasources sharing the connection wait for it to end, and it waits for the running ones before beginning (aborting with `signal` stops waiting).
- DuckDB aborts the transaction on any failed query and would silently roll back on commit: after a failed query (ie: `tx.query()` or a caught `tx.queryOrThrow()`), the transaction is rolled back with a `TRANSACTION_FAILED` error.
- Supports `accessMode: "read only"`, DuckDB has no isolation levels nor nested transactions.

Core: `runTransaction()` returns an `ABORTED` error (rather than `TRANSACTION_FAILED`) when aborted while beginning, ie: waiting for a connection.
