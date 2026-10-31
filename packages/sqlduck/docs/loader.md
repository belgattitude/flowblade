# Loader

`DuckTableLoader` creates a DuckDB table from a Zod schema and loads rows
into it. It replaces `SqlDuck.toTable`, which now delegates to it.

How the rows are written is chosen with a **strategy**. The default,
`ChunkAppenderStrategy`, uses the DuckDB appender, as `toTable` does.

> [!NOTE]
> The loader is not exported yet. It will be published as
> `@flowblade/sqlduck/loader`, marked experimental, and `toTable` will then
> be deprecated. Until then, use `SqlDuck.toTable`.

## Quick start

```typescript
import * as z from "zod";
import { Table } from "@flowblade/sqlduck";
import {
  ChunkAppenderStrategy,
  DuckTableLoader,
} from "@flowblade/sqlduck/loader";

const userSchema = z.object({
  id: z.int32().meta({ primaryKey: true }),
  name: z.string(),
});

async function* getUserRows(): AsyncGenerator<z.infer<typeof userSchema>> {
  // database or api call
}

const loader = new DuckTableLoader({
  conn, // a DuckDBConnection
  strategy: new ChunkAppenderStrategy({ chunkSize: 2048, flushEvery: 100 }),
});

const result = await loader.load({
  table: new Table({ name: "user", database: "mydb" }),
  schema: userSchema,
  rows: getUserRows(),
  mode: "createOrReplace",
});

console.log(`Loaded ${result.totalRows} rows in ${result.timeMs}ms`);
```

## How a load runs

1. Validate the options. An already aborted `signal` rejects here, before
   anything is created.
2. Create the table from the Zod schema (see
   [Zod schema to DuckDB column types](./duckdb_zod_schema_types.md)).
3. Optionally override `preserve_insertion_order`.
4. Open a strategy session.
5. Convert the rows to column chunks of `strategy.chunkSize` rows and pass
   each chunk to the session. Progress callbacks and periodic checkpoints
   run between chunks.
6. Complete the session, then checkpoint if enabled.
7. Restore `preserve_insertion_order`, whether the load succeeded or not.

When something fails after the session is opened, the session is aborted
and `load` rejects with
`Failed to append data into table '<table>' - <message>` (the original error
is in `cause`). The table is kept. Which rows are kept depends on the
strategy, see [Choosing a strategy](#choosing-a-strategy).

## Constructor

```typescript
new DuckTableLoader({ conn, logger, strategy });
```

| Option     | Type               | Default                       | Description                    |
| ---------- | ------------------ | ----------------------------- | ------------------------------ |
| `conn`     | `DuckDBConnection` | required                      | Connection used for the load   |
| `logger`   | logtape `Logger`   | `sqlduckDefaultLogtapeLogger` | Logs progress and failures     |
| `strategy` | `LoadStrategy`     | `new ChunkAppenderStrategy()` | How rows are written, see below |

## `load(params)`

| Option                   | Type                                  | Default                    | Description                                                    |
| ------------------------ | ------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `table`                  | `Table`                               | required                   | Target table                                                   |
| `schema`                 | Zod object                            | required                   | Generates the `CREATE TABLE` DDL and the value converters      |
| `rows`                   | sync/async iterator or generator      | required                   | Rows to load, matching `schema`                                |
| `mode`                   | `LoadMode`                            | `"create"`                 | See [Modes](#modes)                                            |
| `checkpoint`             | `{ every?: number; onComplete?: boolean }` | see [Checkpoints](#checkpoints) |                                                          |
| `preserveInsertionOrder` | `boolean`                             | session setting unchanged  | See [Insertion order](#insertion-order)                        |
| `onProgress`             | `(progress) => void \| Promise<void>` |                            | See [Progress](#progress)                                      |
| `progressEvery`          | `number` (1 to 100_000)               | `1`                        | Call `onProgress` every N chunks                               |
| `signal`                 | `AbortSignal`                         |                            | See [Abort](#abort)                                            |

### Result

| Field            | Type       | Description                         |
| ---------------- | ---------- | ----------------------------------- |
| `timeMs`         | `number`   | Total time of the load              |
| `totalRows`      | `number`   | Number of rows loaded               |
| `createTableDDL` | `string`   | The `CREATE TABLE` statement used   |
| `strategy`       | `string`   | Name of the strategy used           |
| `mode`           | `LoadMode` | Mode used                           |

### Modes

| Mode                  | Statement                    |
| --------------------- | ---------------------------- |
| `"create"`            | `CREATE TABLE`               |
| `"createOrReplace"`   | `CREATE OR REPLACE TABLE`    |
| `"createIfNotExists"` | `CREATE TABLE IF NOT EXISTS` |

With `"createIfNotExists"`, rows are appended to the existing table when it
already exists.

### Checkpoints

A checkpoint writes the WAL into the database file. It needs a database, so
both options require `table.databaseName`.

| Option       | Default                                          | Description                            |
| ------------ | ------------------------------------------------ | -------------------------------------- |
| `onComplete` | `true` when `table.databaseName` is set, else `false` | Checkpoint once all rows are loaded |
| `every`      | none                                             | Checkpoint every N chunks (1 to 100_000) |

Setting `onComplete: true` or `every` on a table without `databaseName`
throws. A failing checkpoint is logged as a warning and does not fail the
load.

### Insertion order

`preserveInsertionOrder: false` lets DuckDB reorder rows, which can be
faster and use less memory. The session value is read before the load and
restored afterwards, even when the load fails. When omitted, the setting is
left untouched. See the
[DuckDB tuning guide](https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#preserving-insertion-order).

### Progress

```typescript
await loader.load({
  // ...
  progressEvery: 5, // every 5 chunks
  onProgress: async ({ totalRows, timeMs, rowsPerSecond }) => {
    await reportProgress(totalRows);
  },
});
```

| Field           | Description                                    |
| --------------- | ---------------------------------------------- |
| `totalRows`     | Rows loaded so far                             |
| `timeMs`        | Time since the previous call                   |
| `rowsPerSecond` | Rate since the previous call                   |

A returned promise is awaited before the next chunk (backpressure). If it
rejects, the load fails.

### Abort

When `signal` aborts, `load` rejects with `signal.reason` as is (an
`AbortError` `DOMException` by default) and closes `rows`. The signal is
checked before each row. The table and the chunks appended before the abort
are kept, but no checkpoint happens.

```typescript
const controller = new AbortController();
const promise = loader.load({ /* ... */ signal: controller.signal });
controller.abort();
await promise; // rejects with an AbortError
```

## Strategies

### Choosing a strategy

| Strategy                 | Writes with                   | 100k rows\* | Use it for                                    | Rows kept when a value fails                      |
| ------------------------ | ----------------------------- | ----------- | --------------------------------------------- | ------------------------------------------------- |
| `ChunkAppenderStrategy`  | appender, one chunk at a time | ~45 ms      | Default, fastest                              | Chunks before the failing one                     |
| `RowAppenderStrategy`    | appender, one value at a time | ~210 ms     | Finding which row and column has bad data     | Only rows flushed before the failure              |
| `PreparedInsertStrategy` | multi-row `INSERT` statements | ~600 ms     | Upserts, ignoring duplicates on a primary key | Statements before the failing one                 |

\* 5 columns (integer, varchar, nullable varchar, bigint, timestamp), memory
database, 4 threads, Node 24. Indicative only, measure with your data.

### `ChunkAppenderStrategy`

Writes each chunk with the DuckDB appender (`appendDataChunk`). This is the
default and the fastest strategy.

```typescript
new ChunkAppenderStrategy({ chunkSize: 2048, flushEvery: 100 });
```

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `chunkSize`  | `2048`  | Rows per DuckDB data chunk, 1 to 2048               |
| `flushEvery` | `100`   | Call `appender.flushSync()` every N chunks, 1 to 100_000 |

Each flush has a fixed cost: frequent flushes slow down inserts (about 30%
slower with 10 than with 100 on a file database). Smaller chunks are slower
too: loading 1M rows with chunks of 2048 is about 1.6x faster than with
1024 (`bench/appender.bench.mitata.ts`). The appender is always flushed and
closed at the end of the load.

### `RowAppenderStrategy`

Appends each value with `appender.appendValue`, then ends the row. About 5x
slower than `ChunkAppenderStrategy`, but a failing value is reported with its
row index (0-based, counted over the whole load) and column name:

```text
Failed to append data into table 'user' - Row 2, column 'status' - 'deleted' is not a member of ENUM('draft', 'published')
```

```typescript
new RowAppenderStrategy({ chunkSize: 2048, flushEvery: 100 });
```

| Option       | Default | Description                                               |
| ------------ | ------- | --------------------------------------------------------- |
| `chunkSize`  | `2048`  | Rows handed to the strategy at once, 1 to 2048            |
| `flushEvery` | `100`   | Call `appender.flushSync()` every N chunks, 1 to 100_000  |

> [!WARNING]
> When a value fails in the middle of a row, DuckDB can't drop the partial
> row, and every row appended since the last flush is discarded. Use a small
> `flushEvery` (e.g. `1`) to keep the rows before the failing one.

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

| Option          | Default   | Description                                       |
| --------------- | --------- | ------------------------------------------------- |
| `rowsPerInsert` | `256`     | Rows per `INSERT` statement, 1 to 2048            |
| `onConflict`    | `"error"` | What to do when a row conflicts with a key, below |

| `onConflict` | Statement               | Effect                      |
| ------------ | ----------------------- | --------------------------- |
| `"error"`    | `INSERT INTO`           | The load fails              |
| `"ignore"`   | `INSERT OR IGNORE INTO` | The existing row is kept    |
| `"replace"`  | `INSERT OR REPLACE INTO`| The existing row is replaced |

`"ignore"` and `"replace"` need a primary key or unique constraint, set with
`.meta({ primaryKey: true })` in the schema. Each statement runs in its own
transaction: when one fails, the rows of the statements before it are kept.
Wrapping the load in a transaction only saves a few percent, the cost is in
binding the values.

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

| Member                 | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `name`                 | Returned in `LoadResult.strategy` and used in logs                           |
| `chunkSize`            | Maximum rows per chunk passed to `appendChunk`; the last chunk can be smaller |
| `open(context)`        | Called once per load, after the table is created. `context` holds `conn`, `table`, `columnNames`, `columnTypes` and `logger` |
| `appendChunk(columns)` | Called for each chunk, values already converted to DuckDB values (column-major) |
| `complete()`           | Called once after the last chunk                                             |
| `abort()`              | Called instead of `complete` (or after a failing `complete`) when the load fails |

`appendChunk`, `complete` and `abort` can be sync or return a promise. Sync
functions avoid an extra `await` per chunk on the hot path. An error thrown
by `abort` is logged and does not replace the original error.

## Migrating from `toTable`

| `toTable`                  | `DuckTableLoader`                                         |
| -------------------------- | --------------------------------------------------------- |
| `new SqlDuck({ conn, logger })` | `new DuckTableLoader({ conn, logger, strategy })`    |
| `rowStream`                | `rows`                                                    |
| `createOptions.create`     | `mode`: `CREATE` → `"create"`, `CREATE_OR_REPLACE` → `"createOrReplace"`, `IF_NOT_EXISTS` → `"createIfNotExists"` |
| `chunkSize`                | `ChunkAppenderStrategy({ chunkSize })`                    |
| `flushSyncFrequency`       | `ChunkAppenderStrategy({ flushEvery })`                   |
| `autoCheckpoint`           | `checkpoint.onComplete`                                   |
| `checkpointChunksFrequency`| `checkpoint.every`                                        |
| `onChunkAppended`          | `onProgress`                                              |
| `onChunkAppendedFrequency` | `progressEvery`                                           |
| `preserveInsertionOrder`   | unchanged                                                 |
| `signal`                   | unchanged                                                 |
| `OnChunkAppendedCb`, `OnChunkAppendedStats` | `OnLoadProgressCb`, `LoadProgress`       |

One default changed: `autoCheckpoint` defaults to `true` and throws without
`table.databaseName`, while `checkpoint.onComplete` defaults to `true` only
when `table.databaseName` is set.

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
  strategy: new ChunkAppenderStrategy({ chunkSize: 2048, flushEvery: 100 }),
}).load({
  table,
  schema,
  rows: getUserRows(),
  checkpoint: { every: 100 },
  mode: "createOrReplace",
});
```

`LoadResult` contains the fields of `ToTableResult` (`timeMs`, `totalRows`,
`createTableDDL`) plus `strategy` and `mode`.
