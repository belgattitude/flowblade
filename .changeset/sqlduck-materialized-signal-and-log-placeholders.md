---
"@flowblade/sqlduck": minor
---

Abort signal and error cause for `withMaterializedKyselyQuery()`, LogTape placeholders in all logs.

- `withMaterializedKyselyQuery()` accepts an abort `signal`: it stops the kysely query stream and `toTable()`, and is given to the `query` callback (ie: `dsDuck.query(sql, { signal })`). A materialization failure keeps the original error as `error.cause`.
- Log messages use LogTape placeholders, values (table, database, rows, time, error message...) are passed as properties. An error message containing `{...}` (ie: DuckDB struct literals) is no longer read as a placeholder. The rendered messages are unchanged, except they now always show the full table name. Thrown error messages are unchanged.
- Fix the "Couldn't create directory" warning that logged a literal `.message`.
