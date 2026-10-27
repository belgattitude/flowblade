---
"@flowblade/core": minor
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

Add `queryOne()` and `queryOneOrThrow()` to datasources, for queries expecting a single row. More than one row is always an error, protecting against a missing condition or broken data integrity.

- `queryOne()` never throws: it returns a `QResult<Row | null>` holding the row, or `null` when there's no row (like `query()` returns `[]`, an empty result isn't an error). More than one row returns an error with `code` "TOO_MANY_RESULTS" (see the `QResult` data changeset).
- `queryOneOrThrow()` returns the row. It throws a `QErrors.NoResult` when there's no row, unless a `defaultValue` is set (ie: default settings), and a `QErrors.TooManyResults` (with `rowCount`) when there are more.

Errors are exported under the `QErrors` namespace (also re-exported by `@flowblade/source-duckdb` and `@flowblade/source-kysely`), usable with `instanceof` and as types. They carry a suggested http `statusCode` (404 for `NoResult`, 500 for `TooManyResults`), so http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception` recognize them.

The errors thrown by `queryOneOrThrow()` can be replaced with `onNoResult` / `onTooManyResults` factories, as datasource defaults (`errors` param) or per query. The SQL is never rewritten (no `LIMIT` added), so checking the row count costs nothing on the happy path.

Row counts other than one are logged with logtape: more than one row as a warning, no row at debug level (often an expected outcome).

```typescript
import { DuckdbDatasource, QErrors, sql } from "@flowblade/source-duckdb";
import { HttpNotFound } from "@httpx/exception";

const ds = new DuckdbDatasource({
  connection,
  // Optional: throw your own errors rather than QErrors.NoResult / QErrors.TooManyResults
  errors: {
    onNoResult: ({ error }) =>
      new HttpNotFound({ message: "Resource not found", cause: error }),
  },
});

const query = sql<{ id: number }>`SELECT id FROM product WHERE id = ${id}`;

// The row might not exist, never throws
const { data: product, error } = await ds.queryOne(query);
if (error) {
  // query failure or more than one row
  throw new Error(error.message, { cause: error.cause });
}
if (product === null) {
  // not found, ie: return a 404
}

// The row must exist: throws HttpNotFound otherwise
const { data: existing } = await ds.queryOneOrThrow(query);

// Or fall back on a default value when there's no row (still throws on
// query failure and more than one row)
const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
  defaultValue: defaultSettings,
});

// Without a custom error, recognize them with instanceof
try {
  await ds.queryOneOrThrow(query);
} catch (e) {
  if (e instanceof QErrors.TooManyResults) {
    console.error(`Expected one row, received ${e.rowCount}`);
  }
  throw e;
}
```
