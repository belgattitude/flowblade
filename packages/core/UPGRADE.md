# Upgrade guide: @flowblade/core

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## 0.7.0

> **Note**: this release contains small breaking changes, listed below. They mostly affect custom datasources, code matching error messages and results built by hand.

### Datasource helpers moved to `@flowblade/core/datasource`

The helpers to implement a datasource are no longer exported from `@flowblade/core`: `createQResultSuccess()`, `createQResultError()` and `createSqlSpan()`. The new `toOneRowQResult()` and `getOneRowOrThrow()` (to implement `queryOne()` / `queryOneOrThrow()`) are exported there too.

**Migrate**: import them from `@flowblade/core/datasource` (ie: custom datasources, tests building results by hand).

```typescript
// Before
import { createQResultError, QMeta } from "@flowblade/core";
// After
import { QMeta } from "@flowblade/core";
import { createQResultError } from "@flowblade/core/datasource";
```

### `QError.code` is required

Every `QError` now has a `code`, so errors can be handled with a `switch`:

| Code | Meaning | `cause` |
| --- | --- | --- |
| `QUERY_FAILED` | the query failed | the driver error |
| `ABORTED` | the query was aborted with its `signal` | the abort reason (ie: a TimeoutError) |
| `TOO_MANY_RESULTS` | `queryOne()` got more than one row | a `QErrors.TooManyResults` |
| `MAP_FAILED` | the `QResult.map()` transform threw | the thrown error |

**Migrate**: QErrors built by hand (ie: tests, custom datasources, `createQResultError()`) must set a `code`.

```typescript
// Before
createQResultError({ message: "Failed", cause: error }, meta);
// After
createQResultError(
  { message: "Failed", code: "QUERY_FAILED", cause: error },
  meta
);
```

`QResult.toJsonifiable()` includes the `code`: strict comparisons of the serialized error (ie: snapshots, `toStrictEqual()`) need it too.

### `QResult.getOrThrow()` throws `QErrors`

Without a custom error function, `getOrThrow()` used to throw a plain `Error` with the QError message. It now throws, depending on the `code`:

| Code | Thrown error | Message |
| --- | --- | --- |
| `QUERY_FAILED` | `QErrors.QueryFailed` (`statusCode` 500) | `"Query failed: <message>"` |
| `ABORTED` | `QErrors.Aborted` (`statusCode` 504 on timeout, 499 otherwise) | `"Query aborted: <message>"` |
| `TOO_MANY_RESULTS` | the `QErrors.TooManyResults` cause itself | unchanged |
| `MAP_FAILED` | a plain `Error` (as before) | unchanged |

They all extend `Error` and keep the original `cause`.

**Migrate**: code matching the thrown message must account for the `"Query failed: "` / `"Query aborted: "` prefixes. Prefer `instanceof`:

```typescript
import { QErrors } from "@flowblade/core";

try {
  result.getOrThrow();
} catch (e) {
  // Before: e.message === "Table not found"
  if (e instanceof QErrors.QueryFailed) {
    // e.message === "Query failed: Table not found", e.cause is the driver error
  }
}
```

### `QResult.isError()` is a method

`isOk()` and `isError()` are now type guards narrowing `data` and `error`, like checking `error`. To support it, `isError` changed from an arrow function property to a method, like `isOk()`.

**Migrate**: only unbound uses are affected, ie: `const { isError } = result; isError()` or passing `result.isError` as a callback. Call it on the result instead: `result.isError()`.

### `QResult` data can be a single row

`QResult` data was always an array of rows. It now holds the rows (`query()`: `QResult<Row[]>`) or a single row or null (`queryOne()`: `QResult<Row | null>`).

**Migrate**: generic code constrained to arrays must widen the constraint to accept both shapes. `query()` results are unchanged.

```typescript
// Before
const toJson = <T extends QResult<unknown[], QError>>(result: T) => {};
// After
const toJson = <T extends QResult<unknown, QError>>(result: T) => {};
```

### `QResult` is a discriminated union

Checking `error` narrows `data`, even after destructuring. As a consequence, `QResult.map()` returns `QResult<TMappedRow[], TError | QError>` instead of `QResult<TMappedRow[] | undefined, TError | undefined>`.

**Migrate**: explicit type annotations of `map()` results must be updated. Code checking `data` for undefined after checking `error` keeps working, the check is just no longer needed.
