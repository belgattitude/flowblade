---
"@flowblade/core": minor
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

The throwing methods accept error factories (except `stream()`). `QResult.getOrThrow()` accepts `onError` / `onTooManyResults`, in the same style as `queryOneOrThrow()`. Each factory receives the default error (ie: `QErrors.QueryFailed`), useful as `cause`.

- `onTooManyResults({ error, rowCount, meta })`: the result has more than one row (`queryOne()` results).
- `onError({ error, qError, meta })`: the other failures, ie: the query failed (`"QUERY_FAILED"`, `"ABORTED"`) or the `map()` transform threw. Switch on `qError.code` if needed.

```typescript
import { HttpInternalServerError } from "@httpx/exception";

const row = (await ds.queryOne(query)).getOrThrow({
  onError: ({ error }) => new HttpInternalServerError({ cause: error }),
  onTooManyResults: ({ error, rowCount }) =>
    new HttpInternalServerError({
      message: `Expected one row, got ${rowCount}`,
      cause: error,
    }),
});
```

`queryOrThrow()` and `queryOneOrThrow()` accept an `onError` factory too, per query or as datasource defaults (`defaultOptions.queryOrThrow` / `defaultOptions.queryOneOrThrow`). All the throwing methods share the same factories:

| Method | Factories | Datasource defaults |
| --- | --- | --- |
| `queryOrThrow()` | `onError` | `defaultOptions.queryOrThrow` |
| `queryOneOrThrow()` | `onError`, `onNoResult`, `onTooManyResults` | `defaultOptions.queryOneOrThrow` |
| `QResult.getOrThrow()` | `onError`, `onTooManyResults` |  |

```typescript
import { HttpGatewayTimeout, HttpInternalServerError } from "@httpx/exception";

const onError = ({ error, qError }) =>
  qError.code === "ABORTED"
    ? new HttpGatewayTimeout({ cause: error })
    : new HttpInternalServerError({ cause: error });

const ds = new DuckdbDatasource({
  connection: duckdb,
  defaultOptions: {
    queryOrThrow: { onError },
    queryOneOrThrow: { onError },
  },
});
```

Passing a function receiving the `QError` to `getOrThrow()` still works: `result.getOrThrow((qErr) => new Error(qErr.message))`.

New types: `QErrorFactory`, `QGetOrThrowErrorFactories` and `QueryOrThrowOptions`.
