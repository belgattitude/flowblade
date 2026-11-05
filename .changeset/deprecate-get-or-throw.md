---
"@flowblade/core": minor
"@flowblade/source-duckdb": patch
"@flowblade/source-kysely": patch
---

Deprecate `QResult.getOrThrow()`, use the datasource throwing methods instead (they throw the same errors and support the `defaultOptions` error factories):

- `ds.queryOrThrow(query)` instead of `(await ds.query(query)).getOrThrow()`
- `ds.queryOneOrThrow(query, { defaultValue: null })` instead of `(await ds.queryOne(query)).getOrThrow()`

Add `getDataOrThrow(result, factories)` to `@flowblade/core/datasource`, used by the datasources to implement `queryOrThrow()`.
