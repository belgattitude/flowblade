# Upgrade guide: @flowblade/source-duckdb

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## 0.33.0

> **Note**: this release contains small breaking changes, listed below. They mostly affect code matching error messages or comparing serialized errors.

`QResult` changes from `@flowblade/core` 0.7.0 apply too: required `QError.code`, `getOrThrow()` throwing `QErrors`, `isError()` as a method, single row data and discriminated union. See the [@flowblade/core upgrade guide](https://github.com/belgattitude/flowblade/blob/main/packages/core/UPGRADE.md#070).

### Error results have a `code`

`query()` errors now have a `code`: `"QUERY_FAILED"` (the DuckDB error as `cause`, as before) or `"ABORTED"` (the abort reason as `cause`, as before).

**Migrate**: strict comparisons of `result.error` or `result.toJsonifiable()` (ie: snapshots, `toStrictEqual()`) need the `code`. To detect aborted queries, prefer `error.code === "ABORTED"` over inspecting the `cause`.

### Throwing methods throw `QErrors`

| Method | Before | After |
| --- | --- | --- |
| `queryOrThrow()`, query failure | `Error("Query failed: <message>")` | `QErrors.QueryFailed`, same message |
| `queryOrThrow()`, aborted | `Error("Query failed: <message>")` | `QErrors.Aborted("Query aborted: <message>")` |
| `stream()`, query failure | `Error("<message>")` | `QErrors.QueryFailed("Query failed: <message>")` |
| `stream()`, aborted | `Error("<message>")` | `QErrors.Aborted("Query aborted: <message>")` |

They all extend `Error` and keep the same `cause` (the DuckDB error, or the abort reason when aborted). They carry a suggested http `statusCode`: 500 for `QueryFailed`, 504 for an aborted query on timeout and 499 otherwise.

**Migrate**: code matching the thrown message must account for the new prefixes. Prefer `instanceof`:

```typescript
import { QErrors } from "@flowblade/source-duckdb";

try {
  for await (const row of ds.stream(query, { signal })) {
    // ...
  }
} catch (e) {
  if (e instanceof QErrors.Aborted) {
    // e.cause is the abort reason, ie: a TimeoutError (e.statusCode === 504)
  } else if (e instanceof QErrors.QueryFailed) {
    // e.cause is the DuckDB error
  }
  throw e;
}
```
