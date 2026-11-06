---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": minor
---

Add transaction conflicts and retries.

- New `TRANSACTION_CONFLICT` error code and `QErrors.TransactionConflict` (409): the transaction conflicts with a concurrent one (serialization failure, deadlock), thrown by `transactionOrThrow()`.
- New `retry` option: `ds.transaction(fn, { retry: { maxRetries: 3 } })` runs the transaction again on conflict (exponential backoff with jitter by default: 25-50ms, 50-100ms, 100-200ms... up to 500ms-1s, or `delayMs`), the transaction span gets `retries`.
- `@flowblade/source-kysely`: recognizes the Postgres ("40001", "40P01"), SQL Server (1205, 3960) and MySQL (1213) conflicts, the new `isTransactionConflict` param replaces the detection.
- `@flowblade/source-duckdb`: recognizes the DuckDB conflicts ("TransactionContext Error: ... conflict").
- `@flowblade/core`: `runTransaction()` takes `isConflictError` and `onRetry`, and `TransactionBeginContext.assertActive()` rejects the queries of a transaction datasource used after its callback ended.
