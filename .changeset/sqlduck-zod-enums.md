---
"@flowblade/sqlduck": minor
---

Support enums from zod schemas to improve ETL performance

- `z.enum([...])` columns and `z.array(z.enum([...]))` list columns are created as DuckDB `ENUM` (declared inline in the `CREATE TABLE`). Values are stored as small integer codes, which reduces storage and speeds up filtering and grouping compared to `VARCHAR`. Values outside the enum are rejected when appending.
- List items now follow the same type inference as columns: `z.array(z.uuid())` → `UUID[]`, `z.array(z.iso.date())` → `DATE[]`, `z.array(z.iso.datetime())` → `TIMESTAMP_MS[]` and `z.array(zodCodecs.bigintToString)` → `BIGINT[]` (previously `VARCHAR[]`).
- Fix `toTable` failing with `Unsupported duck type` on `TIMESTAMP` and `TIMESTAMP[]` columns (`duckdbType: "TIMESTAMP"` / `"TIMESTAMP[]"`).
- Add a [Zod to DuckDB types](https://github.com/belgattitude/flowblade/blob/main/packages/sqlduck/docs/duckdb_zod_schema_types.md) reference, replacing `README_TYPES.md`.

**Breaking:** tables created by a previous version with `IF_NOT_EXISTS` keep their `VARCHAR[]` list columns, appending to them now fails with a type mismatch. Recreate the table (ie: `create: "CREATE_OR_REPLACE"`) or set the previous type explicitly with `.meta({ duckdbType: "VARCHAR[]" })`.
