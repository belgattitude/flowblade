---
"@flowblade/sqlduck": minor
---

Add the experimental `DuckTableLoader` (`@flowblade/sqlduck/loader`) and `DuckSettingsManager.withSessionSettings`, `SqlDuck.toTable` now delegates to the loader. See `docs/loader.md`.

**Breaking**: `toTable` no longer accepts `preserveInsertionOrder`. It used a plain `SET`, which DuckDB applies to every connection of the instance, not only the one running the load. Wrap the call to change the setting for that connection only:

```typescript
import { DuckSettingsManager } from "@flowblade/sqlduck";

await new DuckSettingsManager(conn).withSessionSettings(
  { preserve_insertion_order: false },
  () => sqlDuck.toTable({ table, schema, rowStream })
);
```

- loader: pluggable load strategies, `ChunkAppenderStrategy` (default, DuckDB appender), `RowAppenderStrategy` (reports the row and column of a failing value) and `PreparedInsertStrategy` (upserts with `onConflict: 'ignore' | 'replace'`).
- loader: modes `create`, `createOrReplace`, `createIfNotExists` and `append`, an existing table must have the schema columns in the same order.
- loader: progress every `intervalMs` (default 1000ms, independent of the chunk size) or `everyRows`, checkpoints and flushes counted in rows (`checkpoint.everyRows`, `flushEveryRows`).
- loader: checkpoint once loaded by default when the table database is stored in a file (detected with `duckdb_databases()`, also for tables without `databaseName`).
- settings: `DuckSettingsManager.withSessionSettings(settings, fn)` overrides settings for one connection (`SET SESSION`) and restores them, `DuckSessionSettings`, `DuckGlobalSettings` and `DuckSettings` types are generated from DuckDB.
- toTable: `rowStream` accepts any sync or async iterable (ie: arrays), codec fields accept their input type (ie: `bigint` for `zodCodecs.bigintToString`).
- toTable: errors and logs now read `Failed to load data into table '<table>'` and `Loaded <n> rows into table '<table>'`, a table in a database that is not attached fails before the table is created.
- toTable: `onChunkAppended` stats no longer report an infinite `rowsPerSecond` for chunks appended in under a millisecond.
