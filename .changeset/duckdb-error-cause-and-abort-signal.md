---
"@flowblade/source-duckdb": minor
---

Keep the driver error as cause, support aborting queries and require Node.js `>=22.18.0`.

- `query()` failures keep the original DuckDB error as `error.cause`, `queryOrThrow()` rethrows with it as error `cause`.
- `query()` accepts an abort `signal`: an aborted query is interrupted on the connection (`connection.interrupt()`) and returns an error result, an already aborted signal doesn't run the query.
- The error log uses a logtape placeholder (`Query "{queryName}" failed: {errorMessage}`), a DuckDB message containing `{...}` (ie: struct literals) is no longer read as a placeholder. The rendered message is unchanged.
- Implement `stream()` (was throwing "Not implemented yet"): rows are streamed chunk by chunk from DuckDB and converted like `query()` results. It supports early exit (`break`), the abort `signal` (an aborted stream always throws, never ends as if complete) and logs like `query()` (`Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)`). The `chunkSize` option is ignored, DuckDB uses its own chunk size.
- Log properties now include `method` (`"query"` or `"stream"`).
- New `logParams` datasource option (default `true`): set it to `false` to leave the query params out of the logs when they might contain sensitive data. Params stay available in the result meta.
- Require Node.js `>=22.18.0` (was `>=20.9.0`), aligned with `@flowblade/core`.
