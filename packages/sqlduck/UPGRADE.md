# Upgrade guide: @flowblade/sqlduck

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## 0.46.0

No breaking change: `QueryExporter` (`@flowblade/sqlduck/export`) and `DuckSecretsManager` are additions, see [#1525](https://github.com/belgattitude/flowblade/pull/1525). A few things to know when adopting them:

### `@flowblade/sqlduck/export` types reference Kysely

`QueryExporter` accepts a Kysely query as `source`, so the types of the `@flowblade/sqlduck/export` entry import the types of `kysely`, an optional peer dependency. There is no runtime import: exporting DuckDB queries (`sql`) works without `kysely`.

**Migrate**: nothing to do when `kysely` is installed or when `skipLibCheck` is enabled. Otherwise install `kysely` (ie: `pnpm add -D kysely`) or enable `skipLibCheck` in your tsconfig.

### Exports to a response need their body to be read

`toResponse()` exports to a temporary file, removed when the body is fully read, cancelled or aborted. A body left unread for `idleTimeoutMs` (60 seconds by default) fails and its file is removed.

**Migrate**: nothing to do when the `Response` is returned to the client. Raise `idleTimeoutMs` when clients may stall for longer between two reads.

### Extensions are installed on first use

The Excel format and the object storage urls install and load a DuckDB extension the first time they are used (`excel`, `azure` or `httpfs`), which needs network access.

**Migrate**: in an environment without network access, install the extensions beforehand (ie: in the docker image).

```typescript
import { DuckExtensionsManager } from "@flowblade/sqlduck";

const extensions = new DuckExtensionsManager(conn);
await extensions.install("azure");
await extensions.load("azure");
```

## 0.45.0

### DuckDB 1.x is no longer supported

The `@duckdb/node-api` peer dependency is now `^2.0.0-r.1` (was `^1.5.6-r.1 || ^2.0.0-r.1`).

**Migrate**: upgrade `@duckdb/node-api` to 2.x (ie: `pnpm add @duckdb/node-api@^2.0.0-r.1`). Error messages changed in DuckDB 2.0 (ie: "Resource In Use Error:" rather than "Binder Error:" for an already attached database file), check code matching on them.

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
