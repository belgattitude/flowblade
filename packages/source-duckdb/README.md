# @flowblade/source-duckdb

[![npm](https://img.shields.io/npm/v/@flowblade/source-duckdb?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-duckdb) [![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/CHANGELOG.md) [![bundles](https://img.shields.io/static/v1?label=&message=esm&logo=rolldown&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/.size-limit.ts) [![node](https://img.shields.io/static/v1?label=Node&message=22.18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility) [![downloads](https://img.shields.io/npm/dm/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-duckdb) [![license](https://img.shields.io/npm/l/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

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

if (error) {
  // Typed as QError, data is undefined
  console.log(error.code, error.message);
} else {
  // Checking error narrows data to Row[]
  console.log(data);
}

// Optionally: map over the data to transform it
const { data: mappedData } = result.map((row) => {
  return {
    id: row.productId,
    key: `key-${row.productId}`,
  };
});

// Or get the rows, throws a QErrors.QueryFailed on error (the DuckDB error as cause)
const { data: rows } = await ds.queryOrThrow(rawSql);
```

### Query a single row

`queryOne()` expects at most one row. Like `query()` it never throws: `data` holds the row, or `null` when the query returns no row.

```typescript
const query = sql<{ id: number; name: string }>`
  SELECT id, name FROM product WHERE id = ${id}::INTEGER
`;

const { data: product, error } = await ds.queryOne(query);

if (error) {
  // Query failure, or more than one row (error.code === "TOO_MANY_RESULTS")
  throw new Error(error.message, { cause: error.cause });
}
if (product === null) {
  // Not found, ie: return a 404
}

// Optionally: map the row (null is kept as is, the mapper isn't called)
const { data: item } = (await ds.queryOne(query)).map((row) => ({
  ...row,
  key: `key-${row.id}`,
}));
```

`queryOneOrThrow()` returns the row, and throws when there isn't exactly one:

```typescript
import { QErrors } from "@flowblade/source-duckdb";
import { HttpNotFound } from "@httpx/exception";

// Throws a QErrors.NoResult (no row) or a QErrors.TooManyResults (more than one)
const { data: row, meta } = await ds.queryOneOrThrow(query);

// Return a default value when there's no row (still throws on query
// failure and when there's more than one row)
const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
  defaultValue: defaultSettings,
});

// Throw your own errors
const { data: product } = await ds.queryOneOrThrow(query, {
  onNoResult: ({ error }) =>
    new HttpNotFound({ message: `${id} not found`, cause: error }),
});

// Or recognize the flowblade errors
try {
  await ds.queryOneOrThrow(query);
} catch (e) {
  if (e instanceof QErrors.NoResult) {
    // e.statusCode === 404
  } else if (e instanceof QErrors.TooManyResults) {
    console.error(`Expected one row, got ${e.rowCount}`); // e.statusCode === 500
  }
  throw e;
}
```

The error factories can also be set once for the whole datasource with `defaultOptions`, keyed by method name (the options passed per query win):

```typescript
import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";

const ds = new DuckdbDatasource({
  connection: duckdb,
  defaultOptions: {
    // Used by queryOneOrThrow() only, queryOne() never throws
    queryOneOrThrow: {
      // onError: ({ error }) => ..., for query failures
      onNoResult: ({ error }) =>
        new HttpNotFound({ message: "Resource not found", cause: error }),
      onTooManyResults: ({ error, rowCount }) =>
        new HttpInternalServerError({
          message: `Expected one row, got ${rowCount}`,
          cause: error,
        }),
    },
  },
});
```

`QErrors.NoResult` and `QErrors.TooManyResults` carry a suggested http `statusCode` (404 and 500), see [Error handling](#error-handling).

#### `queryOneOrThrow()` vs `queryOne().getOrThrow()`

They throw the same errors, except when there's no row:

```typescript
// A: QResult.getOrThrow() on a queryOne() result
const row = (await ds.queryOne(query)).getOrThrow();

// B: the datasource method
const { data: row, meta } = await ds.queryOneOrThrow(query);
```

|  | A: `queryOne().getOrThrow()` | B: `queryOneOrThrow()` |
| --- | --- | --- |
| No row | returns `null` | throws `QErrors.NoResult` (404), or returns `defaultValue` |
| More than one row | throws `QErrors.TooManyResults` (500) | throws `QErrors.TooManyResults` (500) |
| Query failure | throws `QErrors.QueryFailed` / `QErrors.Aborted` | throws `QErrors.QueryFailed` / `QErrors.Aborted` |
| Returns | the row | `{ data, meta }` |
| Custom errors | `onError` / `onTooManyResults`, per call | `onError` / `onNoResult` / `onTooManyResults`, per query or with `defaultOptions` |

Only B throws when there's no row: for A, an empty result isn't an error.

Both take error factories receiving the default error, useful as `cause`:

```typescript
import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";

const onTooManyResults = ({ error, rowCount }) =>
  new HttpInternalServerError({
    message: `Expected one row, got ${rowCount}`,
    cause: error,
  });

// A: onError for query failures (switch on qError.code if needed)
const row = (await ds.queryOne(query)).getOrThrow({
  onTooManyResults,
  onError: ({ error }) => new HttpInternalServerError({ cause: error }),
});

// B: onNoResult for no row, onError for query failures (optional)
const { data } = await ds.queryOneOrThrow(query, {
  onTooManyResults,
  onNoResult: ({ error }) => new HttpNotFound({ cause: error }),
});
```

Both are safe to fall back on a default value, unlike reading `data` without checking `error`:

```typescript
// ✅ Query failures and more than one row still throw
const settings = (await ds.queryOne(query)).getOrThrow() ?? defaultSettings;
const { data: settings } = await ds.queryOneOrThrow(query, {
  defaultValue: defaultSettings,
});

// ❌ On error, data is undefined: the fallback hides the failure
const { data } = await ds.queryOne(query);
const settings = data ?? defaultSettings;
```

> **Note**: the SQL is never rewritten (no `LIMIT` added) and checking the row count costs nothing, but all rows are fetched. When the query isn't constrained by a unique key, bound it to 2 rows (ie: `LIMIT 2`).

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

A failed stream throws a `QErrors.QueryFailed` with the DuckDB error as `cause`, or a `QErrors.Aborted` (see [Aborting queries](#aborting-queries)). The `chunkSize` option is ignored, DuckDB uses its own chunk size (2048 rows).

### Error handling

`query()` never throws, failures are returned in `result.error` with the original DuckDB error as `cause` (or the abort reason when aborted):

```typescript
const result = await ds.query(rawSql);

if (result.error) {
  console.log(result.error.message); // ie: "Failed to extract statements: Parser Error: ..."
  console.log(result.error.cause); // The original DuckDB error
}

// The cause is never serialized, safe to send to clients
const json = result.toJsonifiable();
```

Every error has a `code`, to `switch` over:

```typescript
const { data, error } = await ds.query(query);
if (error) {
  switch (error.code) {
    case "QUERY_FAILED": // the DuckDB error is the cause
    case "ABORTED": // aborted with the signal, the abort reason is the cause
    case "TOO_MANY_RESULTS": // queryOne() got more than one row
    case "MAP_FAILED": // the result.map() transform threw
  }
}
```

The throwing methods (`queryOrThrow()`, `queryOneOrThrow()`, `stream()` and `QResult.getOrThrow()`) throw errors exported under the `QErrors` namespace, usable with `instanceof`:

| Error | When | `statusCode` |
| --- | --- | --- |
| `QErrors.QueryFailed` | the query failed, message prefixed with `"Query failed: "`, the DuckDB error as `cause` | 500 |
| `QErrors.Aborted` | the query was aborted, message prefixed with `"Query aborted: "`, the abort reason as `cause` | 504 on timeout, 499 otherwise |
| `QErrors.NoResult` | `queryOneOrThrow()` got no row | 404 |
| `QErrors.TooManyResults` | `queryOne()` / `queryOneOrThrow()` got more than one row (with `rowCount`) | 500 |

The `statusCode` is a suggested http status, recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`:

```typescript
import { QErrors } from "@flowblade/source-duckdb";
import { isErrorWithErrorStatusCode } from "@httpx/exception";

try {
  const { data } = await ds.queryOrThrow(query, {
    signal: AbortSignal.timeout(5_000),
  });
} catch (e) {
  if (e instanceof QErrors.Aborted) {
    // e.statusCode === 504, e.cause is the TimeoutError
  }
  if (isErrorWithErrorStatusCode(e)) {
    // ie: return new Response(null, { status: e.statusCode });
  }
  throw e;
}
```

To throw your own errors, the throwing methods accept error factories, per call or as datasource defaults (`defaultOptions`, keyed by method name, the options passed per call win). Each factory receives the default error, useful as `cause`:

| Method | Factories | Datasource defaults |
| --- | --- | --- |
| `queryOrThrow()` | `onError` | `defaultOptions.queryOrThrow` |
| `queryOneOrThrow()` | `onError`, `onNoResult`, `onTooManyResults` | `defaultOptions.queryOneOrThrow` |
| `QResult.getOrThrow()` | `onError`, `onTooManyResults` |  |

`onError({ error, qError, meta })` handles query failures (`qError.code`: `"QUERY_FAILED"` or `"ABORTED"`, and `"MAP_FAILED"` for `getOrThrow()`), the row count errors have their own factories.

```typescript
import { HttpGatewayTimeout, HttpInternalServerError } from "@httpx/exception";

const onError = ({ error, qError }) =>
  qError.code === "ABORTED"
    ? new HttpGatewayTimeout({ cause: error })
    : new HttpInternalServerError({ cause: error });

// Per call
const { data } = await ds.queryOrThrow(query, { onError });

// Or for the whole datasource
const ds = new DuckdbDatasource({
  connection: duckdb,
  defaultOptions: {
    queryOrThrow: { onError },
    queryOneOrThrow: { onError },
  },
});
```

### Aborting queries

All the query methods and `stream()` accept an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), the running query is interrupted with [`connection.interrupt()`](https://github.com/duckdb/duckdb-node-neo):

```typescript
const result = await ds.query(rawSql, {
  signal: AbortSignal.timeout(5_000),
});
// An aborted query returns an error result with code "ABORTED", the throwing
// methods and streams throw a QErrors.Aborted (504 on timeout, 499 otherwise).
// In both cases the error cause is the abort reason (ie: AbortError, TimeoutError)
```

> **Note**: the interrupt applies to the connection, so it stops whatever runs on the datasource connection at that time.

### Logging

Queries are logged with [LogTape](https://logtape.org) under the `["flowblade", "duckdb"]` category: debug when starting, info on success (time and affected rows), error on failure. `queryOne()` and `queryOneOrThrow()` also log more than one row as a warning and no row at debug level. Nothing is logged until LogTape is configured by your application:

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
| Bun | ✅ | Bun 1.4+, unit tests run on CI with the latest Bun |
| Deno | ✅ | Deno LTS, unit tests run on CI with Deno 2 |
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
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">JetBrains</a>
    </td>
   </tr>
</table>

## License

MIT © [Sébastien Vanvelthem](https://github.com/belgattitude) and contributors.
