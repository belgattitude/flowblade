[**@flowblade/sqlduck v0.16.0**](../README.md)

***

[@flowblade/sqlduck](../README.md) / ToTableParams

# Type Alias: ToTableParams\<TSchema\>

> **ToTableParams**\<`TSchema`\> = `object`

## Type Parameters

### TSchema

`TSchema` *extends* `TableSchemaZod`

## Properties

### autoCheckpoint?

> `optional` **autoCheckpoint?**: `boolean`

If set to `true`, a checkpoint is automatically performed after all rows from the `rowStream` have been processed.
This ensures that all data is persisted and WAL is cleared.

#### Default

```ts
true
```

***

### checkpointChunksFrequency?

> `optional` **checkpointChunksFrequency?**: `number`

Specifies the frequency (in number of chunks) at which a checkpoint should be triggered.

For example, if `chunkSize` is 2048 and `checkpointChunksFrequency` is 5,
a checkpoint will occur every 10,240 rows (5 chunks * 2048 rows/chunk).

***

### chunkSize?

> `optional` **chunkSize?**: `number`

The number of rows to accumulate before appending them to the DuckDB table as a single data chunk.
Tuning this value can impact memory usage and insertion performance.
Valid values are between 1 and 2048.

#### Default

```ts
2048
```

***

### createOptions?

> `optional` **createOptions?**: `TableCreateOptions`

Configuration options for the `CREATE TABLE` statement (e.g., `IF NOT EXISTS`, `CREATE OR REPLACE`).
If omitted, a standard `CREATE TABLE` statement is used.

***

### flushSyncFrequency?

> `optional` **flushSyncFrequency?**: `number`

Specifies the frequency (in number of chunks) at which the `appender.flushSync()` should be called.
Calling `flushSync()` can help to clear internal buffers and make the data visible.

For example, if `chunkSize` is 2048 and `flushSyncFrequency` is 5,
the appender will be flushed every 10,240 rows (5 chunks * 2048 rows/chunk).

***

### onChunkAppended?

> `optional` **onChunkAppended?**: [`OnChunkAppendedCb`](OnChunkAppendedCb.md)

An optional callback invoked after each data chunk is successfully appended to the table.
Useful for tracking progress, logging statistics, or implementing custom hooks during the insertion process.

***

### onChunkAppendedFrequency?

> `optional` **onChunkAppendedFrequency?**: `number`

Specifies the frequency (in number of chunks) at which the `onChunkAppended` callback should be triggered.

For example, if `chunkSize` is 2048 and `onChunkAppendedFrequency` is 5,
the callback will be called every 10,240 rows (5 chunks * 2048 rows/chunk).

#### Default

```ts
1
```

***

### rowStream

> **rowStream**: `RowStream`\<`z.infer`\<`TSchema`\>\>

An iterable (async or sync) or generator that yields rows to be inserted.
Each row must match the structure defined in the `schema`.

***

### schema

> **schema**: `TSchema`

A Zod schema that defines the structure of the table and the expected format of the rows in the `rowStream`.
The schema is used to generate the `CREATE TABLE` DDL and to convert row values to DuckDB types.

***

### table

> **table**: [`Table`](../classes/Table.md)

The target table where the data will be inserted.
This object contains the table name and optionally the schema and database name.
