---
"@flowblade/sqlduck": patch
---

Escape values interpolated in SQL and make `toTable()` more robust.

- `DuckExtensionsManager.install()` rejects invalid extension names, `search({ name })`, `DuckSettingsManager.getCurrentSettings()` and the database attach (`path`, `encryptionKey` and other string options) now escape their values, a value containing a quote can't break or inject SQL anymore.
- `toTable()` restores `preserve_insertion_order` even when the appender can't be created.
- `toTable()` awaits an `onChunkAppended` callback returning a promise even when it isn't an `async` function (backpressure, rejections fail the insertion instead of being unhandled).
- `toTable()` no longer hides the original error when the appender also fails to close.
- `DuckDatabaseManager.createDatabaseFile()` closes the DuckDB instance it opens, the file lock was kept until the process exit (another process couldn't open the file).
