# @flowblade/source-kysely

A source adapter for [Kysely](https://github.com/kysely-org/kysely).

[![npm](https://img.shields.io/npm/v/@flowblade/source-kysely?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-kysely) [![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/CHANGELOG.md) [![codecov](https://img.shields.io/codecov/c/github/belgattitude/flowblade?logo=codecov&label=Unit&flag=flowblade-source-kysely-unit&style=for-the-badge&labelColor=444)](https://app.codecov.io/gh/belgattitude/flowblade/tree/main/packages%2Fsource-kysely) [![bundles](https://img.shields.io/static/v1?label=&message=esm@treeshake&logo=rolldown&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.size-limit.ts) [![node](https://img.shields.io/static/v1?label=Node&message=22.18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility) [![browserslist](https://img.shields.io/static/v1?label=Browser&message=%3E96%25&logo=googlechrome&style=for-the-badge&labelColor=444&color=informational)](#compatibility) [![size](https://img.shields.io/bundlephobia/minzip/@flowblade/source-kysely@latest?label=Max&style=for-the-badge&labelColor=444&color=informational)](https://bundlephobia.com/package/@flowblade/source-kysely@latest) [![downloads](https://img.shields.io/npm/dm/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-kysely) [![license](https://img.shields.io/npm/l/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

## Install

```bash
pnpm add @flowblade/source-kysely kysely

# Install optional drivers
# 01. for Ms SqlServer or Azure Sql Edge
pnpm add tedious tarn
```

Kysely supports

[![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=flat&logo=postgresql&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=postgresql) [![MySQL](https://img.shields.io/badge/mysql-4479A1.svg?style=flat&logo=mysql&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=mysql) [![MicrosoftSQLServer](https://img.shields.io/badge/Microsoft%20SQL%20Server-CC2927?style=flat&logo=microsoft%20sql%20server&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=mssql) [![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=flat&logo=sqlite&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=sqlite)

## Quick start

```typescript
import { KyselyDatasource } from "@flowblade/source-kysely";

// Your Kysely instance, see the Utils section for Ms SqlServer
import { db } from "@/config/db.config.ts";

const ds = new KyselyDatasource({ connection: db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"])
  .leftJoin("product as p", "p.brand_id", "b.id")
  .select(["p.id as product_id", "p.name as product_name"])
  .where("b.created_at", "<", new Date())
  .orderBy("b.name", "desc");

const result = await ds.query(query);

// Or with query information (will be sent in the metadata)
// const result = await ds.query(query, {
//  name: 'getBrands'
// });

// Option 1: the QResult object contains the data, metadata and error
//  - data:  the result rows (TData or undefined if error)
//  - error: the error (QError or undefined if success)
//  - meta:  the metadata (always present)

const { data, meta, error } = result;

// Option 2: You operate over the result, ie: mapping the data

const { data: data2 } = result.map((row) => {
  return {
    ...row,
    key: `key-${row.product_id}`,
  };
});

// Or get the rows, throws a QErrors.QueryFailed on error (the driver error as cause)
const { data: rows } = await ds.queryOrThrow(query);
```

### Query a single row

`queryOne()` expects at most one row. Like `query()` it never throws: `data` holds the row, or `null` when the query returns no row.

```typescript
const query = ds.queryBuilder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"])
  .where("b.id", "=", id);

const { data: brand, error } = await ds.queryOne(query);

if (error) {
  // Query failure, or more than one row (error.code === "TOO_MANY_RESULTS")
  throw new Error(error.message, { cause: error.cause });
}
if (brand === null) {
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
import { QErrors } from "@flowblade/source-kysely";
import { HttpNotFound } from "@httpx/exception";

// Throws a QErrors.NoResult (no row) or a QErrors.TooManyResults (more than one)
const { data: row, meta } = await ds.queryOneOrThrow(query);

// Return a default value when there's no row (still throws on query
// failure and when there's more than one row)
const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
  defaultValue: defaultSettings,
});

// Throw your own errors
const { data: brand } = await ds.queryOneOrThrow(query, {
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

const ds = new KyselyDatasource({
  connection: db,
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

#### Migrating from `queryOne().getOrThrow()`

`QResult.getOrThrow()` is deprecated, use `queryOneOrThrow()`. By default it throws the same errors, but it also applies the `defaultOptions.queryOneOrThrow` factories, which `getOrThrow()` ignored: when they're set, pass `onError: ({ error }) => error` (and `onTooManyResults`) to keep the default errors. Set `defaultValue: null` to keep getting `null` when there's no row:

```typescript
// ⚠️ Deprecated
const row = (await ds.queryOne(query)).getOrThrow();

// ✅ Same behavior: null when there's no row
const { data: row } = await ds.queryOneOrThrow(query, { defaultValue: null });
```

Prefer `defaultValue` (or checking `error`) to falling back on `data`, which hides failures:

```typescript
// ✅ Query failures and more than one row still throw
const { data: settings } = await ds.queryOneOrThrow(query, {
  defaultValue: defaultSettings,
});

// ❌ On error, data is undefined: the fallback hides the failure
const { data } = await ds.queryOne(query);
const settings = data ?? defaultSettings;
```

> **Note**: the SQL is never rewritten (no `LIMIT` added) and checking the row count costs nothing, but all rows are fetched. When the query isn't constrained by a unique key, bound it to 2 rows (ie: `.limit(2)`, or `.top(2)` on Ms SqlServer).

### Streaming

```typescript
import { KyselyDatasource } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ connection: db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"]);

const stream = ds.stream(query, {
  name: "getBrands",
  // Chunksize used when reading the database (only some dialects, ie: postgres)
  // @default undefined
  chunkSize: undefined,
  // Optional abort signal, see "Aborting queries"
  signal: AbortSignal.timeout(30_000),
});

for await (const brand of stream) {
  console.log(brand.name);
  if (brand.name === "Something") {
    // Breaking or returning before the stream has ended will release
    // the database connection and invalidate the stream.
    break;
  }
}
```

A failed stream throws a `QErrors.QueryFailed` with the driver error as `cause`, or a `QErrors.Aborted` (see [Aborting queries](#aborting-queries)).

## Error handling

`query()` never throws, failures are returned in `result.error` with the original driver error as `cause` (or the abort reason when aborted):

```typescript
const result = await ds.query(query);

if (result.error) {
  console.log(result.error.message);
  // The original driver error, ie: a tedious RequestError for Ms SqlServer
  const cause = result.error.cause as { number?: number } | undefined;
  if (cause?.number === 1205) {
    // SQL Server deadlock, the query can be retried
  }
}

// The cause is never serialized, safe to send to clients
const json = result.toJsonifiable();
```

Every error has a `code`, to `switch` over:

```typescript
const { data, error } = await ds.query(query);
if (error) {
  switch (error.code) {
    case "QUERY_FAILED": // the driver error is the cause
    case "ABORTED": // aborted with the signal, the abort reason is the cause
    case "TOO_MANY_RESULTS": // queryOne() got more than one row
    case "MAP_FAILED": // the result.map() transform threw
  }
}
```

The throwing methods (`queryOrThrow()`, `queryOneOrThrow()` and `stream()`) throw errors exported under the `QErrors` namespace, usable with `instanceof`:

| Error | When | `statusCode` |
| --- | --- | --- |
| `QErrors.QueryFailed` | the query failed, message prefixed with `"Query failed: "`, the driver error as `cause` | 500 |
| `QErrors.Aborted` | the query was aborted, message prefixed with `"Query aborted: "`, the abort reason as `cause` | 504 on timeout, 499 otherwise |
| `QErrors.NoResult` | `queryOneOrThrow()` got no row | 404 |
| `QErrors.TooManyResults` | `queryOne()` / `queryOneOrThrow()` got more than one row (with `rowCount`) | 500 |

The `statusCode` is a suggested http status, recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`:

```typescript
import { QErrors } from "@flowblade/source-kysely";
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

`onError({ error, qError, meta })` handles query failures (`qError.code`: `"QUERY_FAILED"` or `"ABORTED"`), the row count errors have their own factories.

```typescript
import { HttpGatewayTimeout, HttpInternalServerError } from "@httpx/exception";

const onError = ({ error, qError }) =>
  qError.code === "ABORTED"
    ? new HttpGatewayTimeout({ cause: error })
    : new HttpInternalServerError({ cause: error });

// Per call
const { data } = await ds.queryOrThrow(query, { onError });

// Or for the whole datasource
const ds = new KyselyDatasource({
  connection: db,
  defaultOptions: {
    queryOrThrow: { onError },
    queryOneOrThrow: { onError },
  },
});
```

## Transactions

Run queries in a transaction with `transaction()` (returns a QResult, never throws) or `transactionOrThrow()`. The callback receives a datasource (`tx`) running its queries in the transaction: committed when the callback returns, rolled back when it throws or calls `tx.rollback()`.

```typescript
const { data: orderId, error, meta } = await ds.transaction(
  async (tx) => {
    const { data: order } = await tx.queryOneOrThrow(
      tx.queryBuilder
        .insertInto("order")
        .values({ customer_id: customerId })
        .output(["inserted.id"])
    );
    const { data: stock } = await tx.queryOneOrThrow(getStock);
    if (stock.quantity < quantity) {
      tx.rollback("out of stock"); // error.code: "ROLLED_BACK"
    }
    await tx.queryOrThrow(insertOrderLines(order.id));
    return order.id;
  },
  {
    name: "createOrder",
    isolationLevel: "serializable", // optional, also: accessMode, signal
  }
);
if (error) {
  // "ROLLED_BACK": the callback threw (ie: tx.queryOrThrow()) or called tx.rollback()
  // "TRANSACTION_FAILED": couldn't begin, commit or roll back
  // "ABORTED": aborted with signal, never committed
  console.error(error.code, error.message, error.cause);
}
// meta: a "transaction" span followed by the spans of the queries

// Or throw: the error thrown by the callback as is, a QErrors.TransactionFailed or a QErrors.Aborted
const { data } = await ds.transactionOrThrow(async (tx) => {
  /* ... */
});
```

> **Note**: `tx.query()` never throws: a failed query doesn't roll back the transaction unless you throw or call `tx.rollback()`, prefer the throwing methods in the callback. Always use `tx` (not `ds`) in the callback, nested transactions aren't supported.

## Aborting queries

All the query methods and `stream()` accept an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal):

```typescript
const result = await ds.query(query, {
  signal: AbortSignal.timeout(5_000),
});
// An aborted query returns an error result with code "ABORTED", the throwing
// methods and streams throw a QErrors.Aborted (504 on timeout, 499 otherwise).
// In both cases the error cause is the abort reason (ie: AbortError, TimeoutError)
```

By default the query keeps running on the database once aborted, only the result is ignored. Use `inflightQueryAbortStrategy` to cancel it on the database (ie: Ms SqlServer, Postgres, MySQL):

```typescript
const ds = new KyselyDatasource({
  connection: db,
  defaultOptions: {
    // Used by query(), queryOrThrow(), queryOne() and queryOneOrThrow()
    query: {
      // 'ignore query' (default) | 'cancel query' | 'kill session'
      inflightQueryAbortStrategy: "cancel query",
    },
  },
});

// Or per query
await ds.query(query, {
  signal,
  inflightQueryAbortStrategy: "cancel query",
});
```

> **Note**: Dialects that can't cancel fall back to `'ignore query'` with a warning. Postgres and MySQL cancel through an extra connection, Ms SqlServer through the same one.

## Logging

Queries are logged with [LogTape](https://logtape.org) under the `["flowblade", "kysely"]` category: debug when starting, info on success (time and affected rows), error on failure. `queryOne()` and `queryOneOrThrow()` also log more than one row as a warning and no row at debug level. Nothing is logged until LogTape is configured by your application:

```typescript
import { flowbladeLogtapeKyselyConfig } from "@flowblade/source-kysely";
import { configure, getConsoleSink } from "@logtape/logtape";

await configure({
  sinks: { console: getConsoleSink() },
  loggers: [
    {
      category: flowbladeLogtapeKyselyConfig.categories,
      lowestLevel: "info",
      sinks: ["console"],
    },
  ],
});
```

Logs include the sql and its params. When params might contain sensitive data, leave them out of the logs (they stay available in the result meta):

```typescript
const ds = new KyselyDatasource({ connection: db, logParams: false });
```

A custom LogTape logger can also be given with the `logger` option.

## Utils

### createKyselyMssqlDialect

Create a Kysely dialect for Ms SqlServer or Azure Sql Edge.

```typescript
import {
  TediousConnUtils,
  createKyselyMssqlDialect,
} from "@flowblade/source-kysely";
import * as Tedious from "tedious";

const jdbcDsn =
  "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

const dialect = createKyselyMssqlDialect({
  tediousConfig,
  // 👉 Optional tarn pool options
  poolOptions: {
    min: 0, // 👉 Minimum number of connections, default 0
    max: 10, // 👉 Maximum number of connections, default 10
    propagateCreateError: true, // 👉 Propagate connection creation errors, default false
  },
  dialectConfig: {
    /**
     * When true, connections are validated before being acquired from the pool,
     * resulting in additional requests to the database.
     *
     * In safe scenarios, this can be set to false to improve performance.
     *
     * Defaults to `true`.
     */
    validateConnections: true,
    /**
     * When true, connections are reset to their initial states when released back to the pool,
     * resulting in additional requests to the database.
     *
     * Defaults to `false`.
     */
    resetConnectionsOnRelease: false,
    // 👉 Override Tedious types to enhance compatibility and modern support
    tediousTypes: {
      ...Tedious.TYPES,
      // see https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      NVarChar: Tedious.TYPES.VarChar,
      // see https://github.com/kysely-org/kysely/issues/1596#issuecomment-3341591075
      DateTime: Tedious.TYPES.DateTime2,
    },
  },
});

const db = new Kysely<DB>({
  dialect,
});
```

> **Note**: For performance you can avoid connection roundtrips by setting `validateConnections` to `false` and `resetConnectionOnRelease` to `false`.

### TediousConnUtils

#### fromJdbcDsn

Parse and validate a JDBC connection string and return a Tedious connection configuration.

```typescript
import { TediousConnUtils } from "@flowblade/source-kysely";
import * as Tedious from "tedious";

// In your .env file
// DB_JDBC_DSN="sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";

const tediousConfig = TediousConnUtils.fromJdbcDsn(process.env.DB_JDBC_DSN);

const tediousConnection = new Tedious.Connection(tediousConfig);
```

## Compatibility

| Level | CI | Description |
| --- | --- | --- |
| Node | ✅ | Requires 22.18+, CI for 22.x, 24.x & 26.x |
| Bun | ✅ | Bun 1.4+, unit tests run on CI with the latest Bun |
| Deno | ✅ | Deno LTS, unit tests run on CI with Deno 2 |
| Browserslist | ✅ | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.browserslistrc) |
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
