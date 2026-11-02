# Upgrade guide: @flowblade/sqlduck

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## 0.44.0

### `toTable` no longer accepts `preserveInsertionOrder`

It used a plain `SET`, which DuckDB applies to every connection of the instance, not only the one running the load.

**Migrate**: wrap the call with `DuckSettingsManager.withSessionSettings`, the setting is changed for that connection only and restored afterwards, even when the load fails.

```typescript
import { DuckSettingsManager } from "@flowblade/sqlduck";

// Before
await sqlDuck.toTable({
  table,
  schema,
  rowStream,
  preserveInsertionOrder: false,
});

// After
await new DuckSettingsManager(conn).withSessionSettings(
  { preserve_insertion_order: false },
  () => sqlDuck.toTable({ table, schema, rowStream })
);
```

### From `SqlDuck.toTable` to `DuckTableLoader`

`toTable` is deprecated, use the new `DuckTableLoader` (`@flowblade/sqlduck/loader`). `toTable` keeps working, it delegates to the loader.

**Migrate**: the frequencies are now counted in **rows** instead of chunks, multiply them by the chunk size (2048 by default).

| `toTable` | `DuckTableLoader` |
| --- | --- |
| `new SqlDuck({ conn, logger })` | `new DuckTableLoader({ conn, logger, strategy })` |
| `rowStream` | `rows` |
| `createOptions.create` | `mode`: `CREATE` → `"create"`, `CREATE_OR_REPLACE` → `"createOrReplace"`, `IF_NOT_EXISTS` → `"createIfNotExists"` |
| `chunkSize` | `new ChunkAppenderStrategy({ chunkSize })` |
| `flushSyncFrequency` (chunks) | `new ChunkAppenderStrategy({ flushEveryRows })` (rows) |
| `autoCheckpoint` | `checkpoint.onComplete` |
| `checkpointChunksFrequency` (chunks) | `checkpoint.everyRows` (rows) |
| `onChunkAppended` | `progress.onProgress` |
| `onChunkAppendedFrequency` (chunks) | `progress.everyRows` (rows) or `progress.intervalMs` |
| `preserveInsertionOrder` | removed, see above |
| `signal` | unchanged |
| `ToTableResult` | `LoadResult`, same fields plus `strategy` and `mode` |
| `OnChunkAppendedCb`, `OnChunkAppendedStats` | `OnLoadProgressCb`, `LoadProgress` (`timeMs` is now `intervalMs`) |

```typescript
// Before
import { SqlDuck } from "@flowblade/sqlduck";

const result = await new SqlDuck({ conn }).toTable({
  table: new Table({ name: "user", database: "mydb" }),
  schema: userSchema,
  rowStream: getUserRows(),
  chunkSize: 2048,
  flushSyncFrequency: 100, // chunks
  checkpointChunksFrequency: 100, // chunks
  onChunkAppendedFrequency: 10, // chunks
  onChunkAppended: ({ totalRows, timeMs, rowsPerSecond }) => {
    console.log(`${totalRows} rows, ${rowsPerSecond} rows/s over ${timeMs}ms`);
  },
  createOptions: { create: "CREATE_OR_REPLACE" },
});

// After
import {
  ChunkAppenderStrategy,
  DuckTableLoader,
} from "@flowblade/sqlduck/loader";

const result = await new DuckTableLoader({
  conn,
  strategy: new ChunkAppenderStrategy({
    chunkSize: 2048, // the default
    flushEveryRows: 204_800, // the default: 100 chunks of 2048 rows
  }),
}).load({
  table: new Table({ name: "user", database: "mydb" }),
  schema: userSchema,
  rows: getUserRows(),
  mode: "createOrReplace",
  checkpoint: { everyRows: 204_800 },
  progress: {
    everyRows: 20_480, // or intervalMs: 1000, the default
    onProgress: ({ totalRows, intervalMs, rowsPerSecond }) => {
      console.log(
        `${totalRows} rows, ${rowsPerSecond} rows/s over ${intervalMs}ms`
      );
    },
  },
});
```

Behavior changes to be aware of:

- **Default mode**: both default to `"create"` (`CREATE TABLE`, fails if the table exists).
- **Checkpoint once loaded**: `autoCheckpoint` defaults to `true` and throws without `table.databaseName`. `checkpoint.onComplete` defaults to `true` only when the table database is stored in a file, detected with or without `table.databaseName`. Set `checkpoint: { onComplete: true }` to keep forcing it.
- **Progress**: without `everyRows`, `onProgress` is called every `intervalMs` (1000ms by default), not after each chunk. It is also called once at the end with the total, when the last rows were not reported yet.
- **Existing tables**: with `"createIfNotExists"` and the new `"append"` mode, an existing table must have the schema columns in the same order, otherwise `load` fails before loading anything.
- **Other strategies**: `RowAppenderStrategy` reports the row and column of a failing value, `PreparedInsertStrategy` supports upserts (`onConflict: "ignore" | "replace"`).

See [docs/loader.md](./docs/loader.md) for the full loader documentation.
