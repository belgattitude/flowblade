---
"@flowblade/sqlduck": minor
---

Add the `DuckTableLoader` (`@flowblade/sqlduck/loader`) and `DuckSettingsManager.withSessionSettings`, `SqlDuck.toTable` now delegates to the loader and is deprecated. See `docs/loader.md` and the migration guide in `UPGRADE.md`.

```typescript
import { DuckDBInstance } from "@duckdb/node-api";
import {
  DuckDatabaseManager,
  DuckSettingsManager,
  Table,
  zodCodecs,
} from "@flowblade/sqlduck";
import {
  ChunkAppenderStrategy,
  DuckTableLoader,
} from "@flowblade/sqlduck/loader";
import * as z from "zod";

const instance = await DuckDBInstance.create();
const conn = await instance.connect();

// Attach a file database, the loader checkpoints it once loaded
const database = await new DuckDatabaseManager(conn).attach({
  type: "filesystem",
  alias: "sales",
  path: "./data/sales.db",
  options: { accessMode: "READ_WRITE" },
});

// The schema generates the CREATE TABLE DDL and the value converters
const orderSchema = z.object({
  id: z.int32().meta({ primaryKey: true }),
  customer: z.string(),
  amount: z.float64(),
  quantity: z.nullable(zodCodecs.bigintToString), // BIGINT
  created_at: zodCodecs.dateToString, // TIMESTAMP
});

// Any sync or async iterable: arrays, generators, database streams...
async function* getOrders(): AsyncGenerator<z.input<typeof orderSchema>> {
  yield {
    id: 1,
    customer: "John",
    amount: 10.5,
    quantity: 2n,
    created_at: new Date(),
  };
}

const loader = new DuckTableLoader({
  conn,
  // Optional, the default strategy uses the DuckDB appender
  strategy: new ChunkAppenderStrategy({
    chunkSize: 2048, // rows per chunk, default and max 2048
    flushEveryRows: 204_800, // default
  }),
});

// Optional, override DuckDB settings for this connection only, restored after the load
const result = await new DuckSettingsManager(conn).withSessionSettings(
  { preserve_insertion_order: false },
  () =>
    loader.load({
      table: new Table({ name: "orders", database: database.alias }),
      schema: orderSchema,
      rows: getOrders(),
      // "create" (default), "createOrReplace", "createIfNotExists" or "append"
      mode: "createOrReplace",
      // Default: checkpoint once loaded when the database is stored in a file
      checkpoint: { everyRows: 1_000_000, onComplete: true },
      progress: {
        intervalMs: 1000, // default, or everyRows: 100_000
        onProgress: ({ totalRows, rowsPerSecond }) => {
          console.log(`${totalRows} rows loaded, ${rowsPerSecond} rows/s`);
        },
      },
      signal: AbortSignal.timeout(60_000),
    })
);

// { timeMs, totalRows, createTableDDL, strategy: "chunkAppender", mode: "createOrReplace" }
console.log(`Loaded ${result.totalRows} rows in ${result.timeMs}ms`);
```

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
- `DuckDatabaseManager.checkpoint()` quotes the database name instead of validating it as an alias, names derived from a file name (ie: `my-data` for `my-data.db`) no longer throw.
- toTable: `rowStream` accepts any sync or async iterable (ie: arrays), codec fields accept their input type (ie: `bigint` for `zodCodecs.bigintToString`).
- toTable: errors and logs now read `Failed to load data into table '<table>'` and `Loaded <n> rows into table '<table>'`, a table in a database that is not attached fails before the table is created.
- toTable: `onChunkAppended` stats no longer report an infinite `rowsPerSecond` for chunks appended in under a millisecond.
