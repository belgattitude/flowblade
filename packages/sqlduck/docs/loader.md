# Loader

`DuckTableLoader` creates a DuckDB table from a Zod schema and loads rows
into it. It replaces `SqlDuck.toTable`, which now delegates to it.

How the rows are written is chosen with a **strategy**. The default,
`ChunkAppenderStrategy`, uses the DuckDB appender, as `toTable` does.

> [!NOTE]
> The loader is experimental, its API may still change. `toTable` will be
> deprecated once it is stable.

## Quick start

```typescript
import * as z from "zod";
import { Table } from "@flowblade/sqlduck";
import { DuckTableLoader } from "@flowblade/sqlduck/loader";

const userSchema = z.object({
  id: z.int32().meta({ primaryKey: true }),
  name: z.string(),
});

async function* getUserRows(): AsyncGenerator<z.input<typeof userSchema>> {
  // database or api call
}

const loader = new DuckTableLoader({ conn }); // a DuckDBConnection

const result = await loader.load({
  table: new Table({ name: "user", database: "mydb" }),
  schema: userSchema,
  rows: getUserRows(),
  mode: "createOrReplace",
  progress: {
    intervalMs: 1000, // the default, or everyRows: 100_000
    onProgress: ({ totalRows, intervalMs, rowsPerSecond }) => {
      console.log(`${totalRows} rows loaded, ${rowsPerSecond} rows/s over ${intervalMs}ms`);
    },
  },
});

console.log(`Loaded ${result.totalRows} rows in ${result.timeMs}ms`);
```

## How a load runs

1. Validate the options. An already aborted `signal` rejects here, before
   anything is created.
2. With `append` or `createIfNotExists`, check that an existing table has
   the schema columns.
3. Create the table from the Zod schema, except in `append` mode (see
   [Zod schema to DuckDB column types](./duckdb_zod_schema_types.md)).
4. Open a strategy session.
5. Convert the rows to column chunks of `strategy.chunkSize` rows and pass
   each chunk to the session. Progress callbacks and periodic checkpoints
   run between chunks.
6. Complete the session, checkpoint if enabled, then report the final
   progress.

When something fails after the session is opened, the session is aborted
and `load` rejects with
`Failed to load data into table '<table>' - <message>` (the original error
is in `cause`). The table is kept. Which rows are kept depends on the
strategy, see [Choosing a strategy](#choosing-a-strategy).

## Constructor

```typescript
new DuckTableLoader({ conn, logger, strategy });
```

| Option     | Type               | Default                       | Description                     |
| ---------- | ------------------ | ----------------------------- | ------------------------------- |
| `conn`     | `DuckDBConnection` | required                      | Connection used for the load    |
| `logger`   | logtape `Logger`   | `sqlduckDefaultLogtapeLogger` | Logs progress and failures      |
| `strategy` | `LoadStrategy`     | `new ChunkAppenderStrategy()` | How rows are written, see below |

A strategy holds no state between loads: a loader and its strategy can be
reused for any number of loads.

## `load(params)`

| Option                   | Type                                 | Default                         | Description                                               |
| ------------------------ | ------------------------------------ | ------------------------------- | --------------------------------------------------------- |
| `table`                  | `Table`                              | required                        | Target table                                              |
| `schema`                 | Zod object                           | required                        | Generates the `CREATE TABLE` DDL and the value converters |
| `rows`                   | `Iterable` or `AsyncIterable`        | required                        | Rows to load: arrays, generators, streams...              |
| `mode`                   | `LoadMode`                           | `"create"`                      | See [Modes](#modes)                                       |
| `checkpoint`             | `{ everyRows?, onComplete? }`        | see [Checkpoints](#checkpoints) |                                                           |
| `progress`               | `{ onProgress, intervalMs? }` or `{ onProgress, everyRows }` |         | See [Progress](#progress)                                 |
| `signal`                 | `AbortSignal`                        |                                 | See [Abort](#abort)                                       |

All the "every N" options count **rows**, so they don't change with the
strategy or its chunk size. As rows are handled in chunks, they trigger at
the end of the chunk crossing the threshold: with chunks of 2048 rows,
`everyRows: 5000` triggers after rows 6144, 10_240, 16_384...

### Rows

A row is typed after the schema, with a few relaxations: date fields accept
`Date | string`, and codecs accept their input and output types (a
`zodCodecs.bigintToString` field accepts `bigint` or `string`). Keys that
aren't in the schema are ignored.

### Result

| Field            | Type                  | Description                                    |
| ---------------- | --------------------- | ---------------------------------------------- |
| `timeMs`         | `number`              | Total time of the load                         |
| `totalRows`      | `number`              | Number of rows loaded                          |
| `createTableDDL` | `string \| undefined` | The `CREATE TABLE` statement, none in `append` |
| `strategy`       | `string`              | Name of the strategy used                      |
| `mode`           | `LoadMode`            | Mode used                                      |

### Modes

| Mode                  | Statement                    | Existing table                 |
| --------------------- | ---------------------------- | ------------------------------ |
| `"create"`            | `CREATE TABLE`               | Fails                          |
| `"createOrReplace"`   | `CREATE OR REPLACE TABLE`    | Replaced                       |
| `"createIfNotExists"` | `CREATE TABLE IF NOT EXISTS` | Rows appended                  |
| `"append"`            | none                         | Rows appended, required        |

With `"createIfNotExists"` and `"append"`, an existing table must have the
schema columns, with the same names and order (the appender writes values
by position). Otherwise `load` fails before loading anything. Column types
are not compared, DuckDB rejects the values that don't fit.

### Checkpoints

A checkpoint writes the WAL into the database file. It needs a database, so
both options require `table.databaseName`.

| Option       | Default                                               | Description                           |
| ------------ | ----------------------------------------------------- | ------------------------------------- |
| `onComplete` | `true` when `table.databaseName` is set, else `false` | Checkpoint once all rows are loaded   |
| `everyRows`  | none                                                  | Checkpoint each time N more rows load |

Setting `onComplete: true` or `everyRows` on a table without `databaseName`
throws. A failing checkpoint is logged as a warning and does not fail the
load.

A checkpoint is not a flush: flushing (see the strategy `flushEveryRows`
option) moves the appender buffer into the table, a checkpoint moves the
WAL into the database file.

### DuckDB settings

The loader doesn't change DuckDB settings. To tune one for a load (ie:
`preserve_insertion_order`, `enable_optimistic_write`), wrap the load with
`DuckSettingsManager.withSessionSettings`: the settings are changed for the
connection only, and restored afterwards, even when the load fails.

```typescript
import { DuckSettingsManager } from "@flowblade/sqlduck";

const result = await new DuckSettingsManager(conn).withSessionSettings(
  { preserve_insertion_order: false },
  () => loader.load({ table, schema, rows })
);
```

Only session settings (`DuckSessionSettings`) are accepted. Global ones
(`DuckGlobalSettings`, ie: `threads`, `wal_autocheckpoint`, `fsync_mode`)
apply to every connection of the instance: set them when creating the
instance. See [Session settings](#session-settings).

### Progress

```typescript
await loader.load({
  // ...
  progress: {
    intervalMs: 1000, // the default, or everyRows: 100_000
    onProgress: async ({ totalRows, intervalMs, rowsPerSecond }) => {
      // totalRows: rows loaded so far
      // intervalMs: time since the previous call
      // rowsPerSecond: rate since the previous call
      await reportProgress({ totalRows, intervalMs, rowsPerSecond });
    },
  },
});
```

| Option       | Description                                                          |
| ------------ | -------------------------------------------------------------------- |
| `everyRows`  | Call `onProgress` each time N more rows are loaded                   |
| `intervalMs` | Call `onProgress` after the first chunk loaded N ms after the last call, `1000` by default, `0` for every chunk |

`everyRows` and `intervalMs` are exclusive. Whatever the option, a last
call reports the total once the load completes, unless it was already
reported.

`intervalMs` doesn't depend on the chunk size. Fast sources are checked at
the end of each chunk. For slow sources, where a chunk can take long to
fill, an unref'd timer asks for the rows read so far to be loaded as a
smaller chunk once the interval is due, so they are loaded and reported on
time. Nothing is reported while no row arrives at all (`totalRows` didn't
change). The timer is cleared when the load ends, succeeds or not, and
costs one boolean check per row.

| Field           | Description                    |
| --------------- | ------------------------------ |
| `totalRows`     | Rows loaded so far             |
| `intervalMs`    | Time since the previous call   |
| `rowsPerSecond` | Rate since the previous call   |

A returned promise is awaited before the next chunk (backpressure). If it
rejects, the load fails.

### Abort

When `signal` aborts, `load` rejects with `signal.reason` as is (an
`AbortError` `DOMException` by default) and closes `rows`. The signal is
checked before each row. The table and the chunks loaded before the abort
are kept, but no checkpoint happens.

```typescript
const controller = new AbortController();
const promise = loader.load({ /* ... */ signal: controller.signal });
controller.abort();
await promise; // rejects with an AbortError
```

## Strategies

### Choosing a strategy

| Strategy                 | Writes with                   | 100k rows\* | Use it for                                    | Rows kept when a value fails         |
| ------------------------ | ----------------------------- | ----------- | --------------------------------------------- | ------------------------------------ |
| `ChunkAppenderStrategy`  | appender, one chunk at a time | ~45 ms      | Default, fastest                              | Chunks before the failing one        |
| `RowAppenderStrategy`    | appender, one value at a time | ~210 ms     | Finding which row and column has bad data     | Only rows flushed before the failure |
| `PreparedInsertStrategy` | multi-row `INSERT` statements | ~600 ms     | Upserts, ignoring duplicates on a primary key | Statements before the failing one    |

\* 5 columns (integer, varchar, nullable varchar, bigint, timestamp), memory
database, 4 threads, Node 24. Indicative only, measure with your data.

All strategies take a `chunkSize` (1 to 2048): the number of rows handed
to the strategy at once.

### `ChunkAppenderStrategy`

Writes each chunk with the DuckDB appender (`appendDataChunk`). This is the
default and the fastest strategy.

```typescript
new ChunkAppenderStrategy({ chunkSize: 2048, flushEveryRows: 204_800 });
```

| Option           | Default   | Description                                                 |
| ---------------- | --------- | ----------------------------------------------------------- |
| `chunkSize`      | `2048`    | Rows per DuckDB data chunk, 1 to 2048                       |
| `flushEveryRows` | `204_800` | Flush the appender each time N more rows are appended       |

Each flush has a fixed cost: frequent flushes slow down inserts (about 30%
slower every 20_480 rows than every 204_800 on a file database). Smaller
chunks are slower too: loading 1M rows with chunks of 2048 is about 1.6x
faster than with 1024 (`bench/appender.bench.mitata.ts`). The appender is
always flushed and closed at the end of the load.

### `RowAppenderStrategy`

Appends each value with `appender.appendValue`, then ends the row. About 5x
slower than `ChunkAppenderStrategy`, but a failing value is reported with its
row index (0-based, counted over the whole load) and column name:

```text
Failed to load data into table 'user' - Row 2, column 'status' - 'deleted' is not a member of ENUM('draft', 'published')
```

```typescript
new RowAppenderStrategy({ chunkSize: 2048, flushEveryRows: 204_800 });
```

| Option           | Default   | Description                                    |
| ---------------- | --------- | ---------------------------------------------- |
| `chunkSize`      | `2048`    | Rows handed to the strategy at once, 1 to 2048 |
| `flushEveryRows` | `204_800` | Flush the appender after every N rows          |

> [!WARNING]
> When a value fails in the middle of a row, DuckDB can't drop the partial
> row, and every row appended since the last flush is discarded. Use a small
> `flushEveryRows` (`1` keeps every row before the failing one).

### `PreparedInsertStrategy`

Inserts rows with prepared multi-row statements
(`INSERT INTO t (a, b) VALUES (?, ?), (?, ?), ...`). It is the slowest
strategy, but the only one that handles primary key conflicts.

```typescript
// Upsert: create the table the first time, then replace rows by primary key
const loader = new DuckTableLoader({
  conn,
  strategy: new PreparedInsertStrategy({ onConflict: "replace" }),
});
await loader.load({ table, schema, rows, mode: "createIfNotExists" });
```

| Option       | Default   | Description                                       |
| ------------ | --------- | ------------------------------------------------- |
| `chunkSize`  | `256`     | Rows per `INSERT` statement, 1 to 2048            |
| `onConflict` | `"error"` | What to do when a row conflicts with a key, below |

| `onConflict` | Statement                | Effect                       |
| ------------ | ------------------------ | ---------------------------- |
| `"error"`    | `INSERT INTO`            | The load fails               |
| `"ignore"`   | `INSERT OR IGNORE INTO`  | The existing row is kept     |
| `"replace"`  | `INSERT OR REPLACE INTO` | The existing row is replaced |

`"ignore"` and `"replace"` need a primary key or unique constraint, set with
`.meta({ primaryKey: true })` in the schema. Each statement runs in its own
transaction: when one fails, the rows of the statements before it are kept.
Wrapping the load in a transaction only saves a few percent, the cost is in
binding the values. There is nothing to flush: each statement writes into
the table.

256 rows per statement was the fastest size measured (64: ~780 ms,
1024: ~660 ms for the 100k rows above).

### Writing a custom strategy

A strategy implements `LoadStrategy`. The loader opens one session per load
and passes it converted column chunks.

```typescript
import type { LoadStrategy } from "@flowblade/sqlduck/loader";

const loggingStrategy: LoadStrategy = {
  name: "logging",
  chunkSize: 1000,
  open: async ({ conn, table, columnNames, columnTypes, logger }) => {
    // prepare resources (appender, prepared statement, temp file...)
    return {
      appendChunk: (columns) => {
        // columns[c][r]: value of column c (schema order) for row r
        logger.info("chunk of {rows} rows", { rows: columns[0]?.length ?? 0 });
      },
      complete: async () => {
        // make the data visible, release resources
      },
      abort: () => {
        // release resources after a failure
      },
    };
  },
};
```

| Member                 | Description                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | Returned in `LoadResult.strategy` and used in logs                                                                            |
| `chunkSize`            | Maximum rows per chunk passed to `appendChunk`, a positive integer; the last chunk can be smaller                             |
| `open(context)`        | Called once per load, after the table is created. `context` holds `conn`, `table`, `columnNames`, `columnTypes` and `logger` |
| `appendChunk(columns)` | Called for each chunk, values already converted to DuckDB values (column-major)                                               |
| `complete()`           | Called once after the last chunk                                                                                              |
| `abort()`              | Called instead of `complete` (or after a failing `complete`) when the load fails                                              |

`appendChunk`, `complete` and `abort` can be sync or return a promise. Sync
functions avoid an extra `await` per chunk on the hot path. An error thrown
by `abort` is logged and does not replace the original error. Keep the
per-load state inside `open`, so the strategy can be reused.

## Migrating from `toTable`

| `toTable`                                   | `DuckTableLoader`                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `new SqlDuck({ conn, logger })`             | `new DuckTableLoader({ conn, logger, strategy })`                                                                  |
| `rowStream`                                 | `rows`                                                                                                             |
| `createOptions.create`                      | `mode`: `CREATE` → `"create"`, `CREATE_OR_REPLACE` → `"createOrReplace"`, `IF_NOT_EXISTS` → `"createIfNotExists"` |
| `chunkSize`                                 | `new ChunkAppenderStrategy({ chunkSize })`                                                                         |
| `flushSyncFrequency` (chunks)               | `new ChunkAppenderStrategy({ flushEveryRows })` (rows)                                                             |
| `autoCheckpoint`                            | `checkpoint.onComplete`                                                                                            |
| `checkpointChunksFrequency` (chunks)        | `checkpoint.everyRows` (rows)                                                                                      |
| `onChunkAppended`                           | `progress.onProgress`                                                                                              |
| `onChunkAppendedFrequency` (chunks)         | `progress.everyRows` (rows) or `progress.intervalMs`                                                               |
| `preserveInsertionOrder`                    | removed, use `withSessionSettings({ preserve_insertion_order })`, see [DuckDB settings](#duckdb-settings) |
| `signal`                                    | unchanged                                                                                                          |
| `OnChunkAppendedCb`, `OnChunkAppendedStats` | `OnLoadProgressCb`, `LoadProgress` (`timeMs` is now `intervalMs`)                                                  |

Behavior changes:

- `autoCheckpoint` defaults to `true` and throws without
  `table.databaseName`, while `checkpoint.onComplete` defaults to `true`
  only when `table.databaseName` is set.
- `onProgress` is also called once at the end with the total, when the last
  rows were not reported yet.

```typescript
// Before
await new SqlDuck({ conn }).toTable({
  table,
  schema,
  rowStream: getUserRows(),
  chunkSize: 2048,
  flushSyncFrequency: 100,
  checkpointChunksFrequency: 100,
  createOptions: { create: "CREATE_OR_REPLACE" },
});

// After
await new DuckTableLoader({
  conn,
  strategy: new ChunkAppenderStrategy({
    chunkSize: 2048,
    flushEveryRows: 204_800,
  }),
}).load({
  table,
  schema,
  rows: getUserRows(),
  checkpoint: { everyRows: 204_800 },
  mode: "createOrReplace",
});
```

`LoadResult` contains the fields of `ToTableResult` (`timeMs`, `totalRows`,
`createTableDDL`) plus `strategy` and `mode`.

## Session settings

`DuckSettingsManager.withSessionSettings(settings, fn)` runs `fn` with DuckDB
settings overridden for one connection (`SET SESSION`), then restores them.

```typescript
const settings = new DuckSettingsManager(conn);
await settings.withSessionSettings(
  { enable_optimistic_write: false, write_buffer_row_group_count: 10 },
  async () => {
    // other connections of the instance keep their values
  }
);
```

- **Session settings only.** A plain `SET` on most DuckDB settings changes
  them for every connection of the instance. `DuckSessionSettings` lists the
  settings that accept `SET SESSION`, `DuckGlobalSettings` the others. A
  setting that DuckDB refuses for a session fails before `fn` runs.
- **Exact restore.** Settings are restored with `RESET SESSION` (reading
  back `current_setting` would round sizes, ie: `206.9 MiB` read as text).
  A session override set on the connection before the call, outside of
  `withSessionSettings`, is reset too.
- **Nesting.** An inner call restores the values of the enclosing call.
- **No concurrent calls on a connection.** Two calls running at the same
  time on one connection would restore each other's settings, the second
  one throws. DuckDB settings are not transactional (`SET LOCAL` is not
  implemented): run concurrent work on its own connection
  (`instance.connect()`).

The types are generated from the installed DuckDB version by probing each
setting with `SET SESSION`:

```bash
pnpm --filter @flowblade/sqlduck generate-settings-types
```
