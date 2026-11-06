---
"@flowblade/core": minor
"@flowblade/source-kysely": patch
"@flowblade/source-duckdb": patch
---

Transactions wait for the queries not awaited by the callback, and log in core.

- A query started in the callback but not awaited (a bug) now always ends before the commit or rollback, rather than racing it.
- `@flowblade/core`: `TransactionBeginContext.trackQuery()` (for the datasources to report their queries), and `runTransaction()` logs the transactions with its `log: { logger, source }` param (begin, retries, result), the datasources no longer duplicate it.
- `@flowblade/source-duckdb`: a query waiting for a transaction on its connection no longer counts the wait in its span `timeMs`, the wait is logged ("waited {lockWaitMs}ms for a transaction").
