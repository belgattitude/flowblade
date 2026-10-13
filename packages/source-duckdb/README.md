# @flowblade/source-duckdb

[![npm](https://img.shields.io/npm/v/@flowblade/source-duckdb?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-duckdb) [![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/CHANGELOG.md) [![bundles](https://img.shields.io/static/v1?label=&message=esm&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/.size-limit.ts) [![node](https://img.shields.io/static/v1?label=Node&message=22.18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility) [![downloads](https://img.shields.io/npm/dm/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-duckdb) [![license](https://img.shields.io/npm/l/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

Duckdb datasource adapter based on [@duckdb/node-api](https://github.com/duckdb/duckdb-node-neo)

## Install

```bash
pnpm add @flowblade/source-duckdb @duckdb/node-api
```

### Query the database

```typescript
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";

// See setup below
import { ds } from "./config.ts";

const params = {
  min: 10,
  max: 99,
  name: "test",
  createdAt: new Date().toISOString(),
};

type Row = { productId: number; name: "test"; createdAt: string };

const rawSql = sql<Row>`

      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,100) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${params.name} as name,
             createdAt
             
      FROM products 
      WHERE productId BETWEEN ${params.min}::INTEGER AND ${params.max}::INTEGER
      AND createdAt < ${params.createdAt}::TIMESTAMPTZ
    `;

const result = await ds.query(rawSql);

const { data, meta, error } = result;

if (data) {
  // Typed as Row[]
  console.log(data);
}
if (error) {
  // Typed as QError
  console.log(error);
}

// Optionally: map over the data to transform it
const { data: mappedData } = result.map((row) => {
  return {
    id: row.productId,
    key: `key-${row.productId}`,
  };
});

// Or get the rows, throws on error (the DuckDB error as cause)
const { data: rows } = await ds.queryOrThrow(rawSql);
```

### Streaming

Rows are streamed chunk by chunk from DuckDB, converted like `query()` results:

```typescript
const stream = ds.stream(rawSql, {
  name: "getProducts",
  // Optional abort signal, see "Aborting queries"
  signal: AbortSignal.timeout(30_000),
});

for await (const row of stream) {
  console.log(row.productId);
  if (row.productId === 50) {
    // Breaking or returning before the stream has ended is supported
    break;
  }
}
```

A failed stream throws an `Error` with the DuckDB error as `cause`. The `chunkSize` option is ignored, DuckDB uses its own chunk size (2048 rows).

### Error handling

`query()` never throws, failures are returned in `result.error` with the original DuckDB error as `cause`:

```typescript
const result = await ds.query(rawSql);

if (result.error) {
  console.log(result.error.message); // ie: "Failed to extract statements: Parser Error: ..."
  console.log(result.error.cause); // The original DuckDB error
}

// The cause is never serialized, safe to send to clients
const json = result.toJsonifiable();
```

`queryOrThrow()` throws an `Error` with the DuckDB error as `cause`.

### Aborting queries

Both `query()` and `stream()` accept an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), the running query is interrupted with [`connection.interrupt()`](https://github.com/duckdb/duckdb-node-neo):

```typescript
const result = await ds.query(rawSql, {
  signal: AbortSignal.timeout(5_000),
});
// An aborted query returns an error result, an aborted stream throws
```

> **Note**: the interrupt applies to the connection, so it stops whatever runs on the datasource connection at that time.

### Logging

Queries are logged with [LogTape](https://logtape.org) under the `["flowblade", "duckdb"]` category: debug when starting, info on success (time and affected rows), error on failure. Nothing is logged until LogTape is configured by your application:

```typescript
import { flowbladeLogtapeDuckdbConfig } from "@flowblade/source-duckdb";
import { configure, getConsoleSink } from "@logtape/logtape";

await configure({
  sinks: { console: getConsoleSink() },
  loggers: [
    {
      category: flowbladeLogtapeDuckdbConfig.categories,
      lowestLevel: "info",
      sinks: ["console"],
    },
  ],
});
```

Logs include the sql and its params. When params might contain sensitive data, leave them out of the logs (they stay available in the result meta):

```typescript
const ds = new DuckdbDatasource({ connection: duckdb, logParams: false });
```

A custom LogTape logger can also be given with the `logger` option.

### Create a duckdb instance

```typescript
import os from "node:os";

import { type DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { DuckdbDatasource } from "@flowblade/source-duckdb";

// Create a connection to a DuckDB instance
const createConnection = async (maxThreads = 4): Promise<DuckDBConnection> => {
  const availableThreads = os.availableParallelism();
  const maxParallelism = Math.min(maxThreads, availableThreads - 1);
  const threads = availableThreads > 1 ? maxParallelism : undefined;

  const instance = await DuckDBInstance.create(":memory:", {
    // Choose between READ_ONLY or READ_WRITE
    // Note that in READ_WRITE mode concurrency is limited to 1
    // See: https://duckdb.org/docs/connect/concurrency.html
    access_mode: "READ_WRITE",
    max_memory: "64MB",
    // Using more threads may require additional memory
    ...(threads ? { threads: threads.toString(10) } : {}),
  });
  return await instance.connect();
};

const duckdb = await createConnection();

// Create a duckdb datasource
export const ds = new DuckdbDatasource({ connection: duckdb });
```

## Compatibility

| Level | CI | Description |
| --- | --- | --- |
| Node | ✅ | Requires 22.18+, CI for 22.x, 24.x & 26.x |
| Typescript | ✅ | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI. |
| ES2022 | ✅ | Dist files checked with [es-check](https://github.com/yowainwright/es-check) |

## Contributors

Contributions are welcome. Have a look to the [CONTRIBUTING](https://github.com/belgattitude/flowblade/blob/main/CONTRIBUTING.md) document.

## Sponsors

[Sponsor](<[sponsorship](https://github.com/sponsors/belgattitude)>), [coffee](<(https://ko-fi.com/belgattitude)>), or star – All is spent for quality time with loved ones. Thanks ! 🙏❤️

### Special thanks to

<table>
  <tr>
    <td>
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">
         <img width="65" src="https://asset.brandfetch.io/idarKiKkI-/id53SttZhi.jpeg" alt="Jetbrains logo" />
      </a>
    </td>
    <td>
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">
        <img width="65" src="https://avatars.githubusercontent.com/u/98402122?s=200&v=4" alt="Jetbrains logo" />    
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">JetBrains</a>
    </td>
    <td align="center">
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">Embie.be</a>
    </td>
   </tr>
</table>

## License

MIT © [Sébastien Vanvelthem](https://github.com/belgattitude) and contributors.
