---
"@flowblade/core": minor
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

Add `queryOne()` and `queryOneOrThrow()` to datasources, for queries expecting a single row. More than one row is always an error, protecting against a missing condition or broken data integrity.

| Method | No row | One row | More than one row | Query failure |
| --- | --- | --- | --- | --- |
| `queryOne()` | `data: null` | `data: row` | `error.code: "TOO_MANY_RESULTS"` | `error.code: "QUERY_FAILED"` / `"ABORTED"` |
| `queryOneOrThrow()` | throws `QErrors.NoResult` (or returns `defaultValue`) | `data: row` | throws `QErrors.TooManyResults` | throws `QErrors.QueryFailed` / `QErrors.Aborted` |

#### `queryOne()`, never throws

Like `query()` returns `[]`, an empty result isn't an error: `data` is `null`.

```typescript
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";

const query = sql<{ id: number }>`SELECT id FROM product WHERE id = ${id}`;

const { data: product, error } = await ds.queryOne(query);
if (error) {
  // error.code: "QUERY_FAILED", "ABORTED" or "TOO_MANY_RESULTS"
  throw new Error(error.message, { cause: error.cause });
}
if (product === null) {
  // not found, ie: return a 404
}
```

#### `queryOneOrThrow()`, the row must exist

```typescript
import { QErrors } from "@flowblade/source-duckdb";
import { HttpNotFound } from "@httpx/exception";

// Throws QErrors.NoResult or QErrors.TooManyResults
const { data: product, meta } = await ds.queryOneOrThrow(query);

// Return a default value when there's no row (ie: default settings)
const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
  defaultValue: defaultSettings,
});

// Throw your own error
const { data: brand } = await ds.queryOneOrThrow(brandQuery, {
  onNoResult: ({ error }) =>
    new HttpNotFound({ message: `Brand ${id} not found`, cause: error }),
});

// Or recognize the flowblade errors
try {
  await ds.queryOneOrThrow(query);
} catch (e) {
  if (e instanceof QErrors.TooManyResults) {
    console.error(`Expected one row, got ${e.rowCount}`);
  }
  throw e;
}
```

#### Datasource defaults

The error factories can be set once per datasource with `defaultOptions`, keyed by method name (per query options win):

```typescript
import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";

const ds = new DuckdbDatasource({
  connection: duckdb,
  defaultOptions: {
    // Used by queryOneOrThrow() only, queryOne() never throws
    queryOneOrThrow: {
      // onError: ({ error }) => ..., for query failures
      onNoResult: ({ error }) =>
        new HttpNotFound({ message: "Resource not found", cause: error }),
      onTooManyResults: ({ error, rowCount }) =>
        new HttpInternalServerError({
          message: `Expected one row, got ${rowCount}`,
          cause: error,
        }),
    },
  },
});
```

#### `QErrors`

`QErrors.NoResult` and `QErrors.TooManyResults` (along with `QErrors.QueryFailed` and `QErrors.Aborted`, see the query errors changeset) are exported under the `QErrors` namespace (from `@flowblade/core`, re-exported by `@flowblade/source-duckdb` and `@flowblade/source-kysely`), usable with `instanceof` and as types. They carry a suggested http `statusCode` (404 and 500), recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`.

#### Notes

- The SQL is never rewritten (no `LIMIT` added, unsupported by SQL Server), so checking the row count costs nothing on the happy path. All rows are fetched though: when the query isn't constrained by a unique key, bound it to 2 rows.
- Row counts other than one are logged with LogTape: more than one row as a warning, no row at debug level (often an expected outcome).
