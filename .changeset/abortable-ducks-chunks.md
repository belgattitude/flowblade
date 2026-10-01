---
"@flowblade/sqlduck": minor
---

Add an optional `signal` (AbortSignal) to `SqlDuck.toTable`, `rowsToColumnsChunks` and `rowsToConvertedColumnsChunks`: once aborted, the iteration throws `signal.reason` and closes the row source. `toTable` rejects with the unwrapped reason so `AbortError` can be detected, keeps the chunks appended before the abort and skips the checkpoint.
