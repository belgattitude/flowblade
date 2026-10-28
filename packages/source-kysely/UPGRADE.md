# Upgrade guide: @flowblade/source-kysely

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## 1.11.0

> **Note**: this minor release contains small breaking changes, listed below. They mostly affect code matching error messages, comparing serialized errors or building results by hand. Review them before upgrading, even though the major version is unchanged.

`QResult` changes from `@flowblade/core` 0.7.0 apply too: required `QError.code`, `getOrThrow()` throwing `QErrors`, `isError()` as a method, single row data and discriminated union. See the [@flowblade/core upgrade guide](https://github.com/belgattitude/flowblade/blob/main/packages/core/UPGRADE.md#070).

### Error results have a `code`

`query()` errors now have a `code`:

- `"QUERY_FAILED"`: the driver error as `cause`, as before.
- `"ABORTED"`: the query was aborted with its `signal`. The `cause` is now the abort reason (`signal.reason`, ie: a TimeoutError), whatever the dialect threw. It used to be the dialect error.

**Migrate**: strict comparisons of `result.error` or `result.toJsonifiable()` (ie: snapshots, `toStrictEqual()`) need the `code`. To detect aborted queries, use `error.code === "ABORTED"` rather than inspecting the `cause`.

### Throwing methods throw `QErrors`

| Method | Before | After |
| --- | --- | --- |
| `queryOrThrow()`, query failure | `Error("Query failed: <message>")` | `QErrors.QueryFailed`, same message |
| `queryOrThrow()`, aborted | `Error("Query failed: <message>")`, dialect error as `cause` | `QErrors.Aborted("Query aborted: <message>")`, abort reason as `cause` |
| `stream()`, query failure | `Error("<message>")` | `QErrors.QueryFailed("Query failed: <message>")` |
| `stream()`, aborted | `Error("<message>")`, dialect error as `cause` | `QErrors.Aborted("Query aborted: <message>")`, abort reason as `cause` |

They all extend `Error`. They carry a suggested http `statusCode`: 500 for `QueryFailed`, 504 for an aborted query on timeout and 499 otherwise. Streaming a raw `sql` query still throws a plain `Error` (usage error).

**Migrate**: code matching the thrown message must account for the new prefixes. Prefer `instanceof`:

```typescript
import { QErrors } from "@flowblade/source-kysely";

try {
  const { data } = await ds.queryOrThrow(query, { signal });
} catch (e) {
  if (e instanceof QErrors.Aborted) {
    // e.cause is the abort reason, ie: a TimeoutError (e.statusCode === 504)
  } else if (e instanceof QErrors.QueryFailed) {
    // e.cause is the driver error, ie: a tedious RequestError
  }
  throw e;
}
```

### Deprecated `inflightQueryAbortStrategy` param

The datasource `inflightQueryAbortStrategy` param moved to `defaultOptions.query`, next to the other per-method defaults. The old param still works (`defaultOptions` wins when both are set) and will be removed in a next major.

```typescript
// Before
new KyselyDatasource({
  connection: db,
  inflightQueryAbortStrategy: "cancel query",
});
// After
new KyselyDatasource({
  connection: db,
  defaultOptions: { query: { inflightQueryAbortStrategy: "cancel query" } },
});
```

The per query `inflightQueryAbortStrategy` option is unchanged.
