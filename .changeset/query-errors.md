---
"@flowblade/core": minor
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

Consistent errors: every `QError` has a `code`, and every throwing method throws an error from the `QErrors` namespace, usable with `instanceof` and carrying a suggested http `statusCode`. See the `UPGRADE.md` of each package to migrate.

| `QError.code` | Thrown error (`*OrThrow()`, `stream()`, `getOrThrow()`) | `statusCode` |
| --- | --- | --- |
| `QUERY_FAILED` (driver error as `cause`) | `QErrors.QueryFailed`, message prefixed with `"Query failed: "` | 500 |
| `ABORTED` (abort reason as `cause`) | `QErrors.Aborted`, message prefixed with `"Query aborted: "` | 504 on timeout, 499 otherwise |
| `TOO_MANY_RESULTS` | `QErrors.TooManyResults` | 500 |
| `MAP_FAILED` (`map()` transform error as `cause`) | `Error` |  |

`queryOneOrThrow()` also throws `QErrors.NoResult` (404) when there's no row.

```typescript
import { QErrors } from "@flowblade/source-duckdb";

// Results: switch over the error code
const { data, error } = await ds.query(query, {
  signal: AbortSignal.timeout(5_000),
});
if (error) {
  switch (error.code) {
    case "ABORTED":
      // error.cause is the abort reason, ie: a TimeoutError
      break;
    case "QUERY_FAILED":
      // error.cause is the driver error
      break;
  }
}

// Throwing methods: use instanceof
try {
  await ds.queryOrThrow(query, { signal: AbortSignal.timeout(5_000) });
} catch (e) {
  if (e instanceof QErrors.Aborted) {
    // e.statusCode === 504
  }
  throw e;
}
```

`queryOne().getOrThrow()` and `queryOneOrThrow()` now throw the same errors, except when there's no row (`null` vs `QErrors.NoResult`).

`QResult.isOk()` and `QResult.isError()` are now type guards, narrowing `data` and `error` like checking `error`:

```typescript
const result = await ds.query(query);
if (result.isError()) {
  // result.error: QError, result.data: undefined
  return console.error(result.error.code);
}
// result.data: Row[]
```

Breaking changes:

- `QError.code` is required: QErrors built by hand (ie: tests, custom datasources) must set it, and `toJsonifiable()` includes it.
- `QResult.getOrThrow()` throws `QErrors.QueryFailed` / `QErrors.Aborted` (messages prefixed with `"Query failed: "` / `"Query aborted: "`) rather than a plain `Error`, and the `QErrors.TooManyResults` cause itself.
- `queryOrThrow()` throws `QErrors.Aborted` with a `"Query aborted: "` message when aborted, and `stream()` errors are prefixed with `"Query failed: "` / `"Query aborted: "`.
- `@flowblade/source-kysely`: the `cause` of an aborted query is the abort reason (`signal.reason`) rather than the dialect error.
- `QResult.isError` is a method rather than an arrow function property: unbound uses (ie: `const { isError } = result`) must call it on the result.
