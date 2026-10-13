---
"@flowblade/source-duckdb": minor
---

Keep the driver error as cause, support aborting queries and require Node.js `>=22.18.0`.

- `query()` failures keep the original DuckDB error as `error.cause`, `queryOrThrow()` rethrows with it as error `cause`.
- `query()` accepts an abort `signal`: an aborted query is interrupted on the connection (`connection.interrupt()`) and returns an error result, an already aborted signal doesn't run the query.
- The error log uses a logtape placeholder (`Query "{queryName}" failed: {errorMessage}`), a DuckDB message containing `{...}` (ie: struct literals) is no longer read as a placeholder. The rendered message is unchanged.
- Require Node.js `>=22.18.0` (was `>=20.9.0`), aligned with `@flowblade/core`.
