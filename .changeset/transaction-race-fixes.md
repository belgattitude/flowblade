---
"@flowblade/core": patch
"@flowblade/source-duckdb": patch
---

Transaction race fixes.

- `@flowblade/core`: a transaction aborted by the synchronous part of `begin` is rolled back once (it was rolled back twice).
- `@flowblade/source-duckdb`: a `withConnectionLock()` callback run in a transaction callback is waited for before the commit or rollback, even when not awaited (it could run after the transaction ended, outside of it).
