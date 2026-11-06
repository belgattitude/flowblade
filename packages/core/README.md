# @flowblade/core

Internal contracts and utilities for flowblade adapters. You generally don't have to install this package separately.

## Install

```bash
pnpm add @flowblade/core
```

## Usage

### QResult

A Result object specialized for database interactions, returned by the datasources (ie: `query()`, `queryOne()`). It holds either `data` or `error`, and `meta` (sql, params, timing...) is always present.

`data` holds the rows for `query()` (`Row[]`), or the row or `null` for `queryOne()` (`Row | null`).

### Create a success QResult

```typescript
const successResult = new QResult({
  data: [{ name: "Seb" }],
  meta: new QMeta({
    spans: {
      type: "sql",
      timeMs: 13,
      sql: "SELECT name FROM users",
      affectedRows: 1,
      params: [],
    },
  }),
});

// 👇 You can destructure data, meta and error
const { data, meta, error } = successResult;

if (error) {
  // typed in this case to QError, data is undefined
  console.error(error);
} else {
  // 👇 checking error narrows data to { name: string }[]
  console.log(data); // [{ name: 'Seb' }]
}
```

#### Create a failure QResult

```typescript
const failureResult = new QResult<SuccessPayload, QError>({
  error: {
    message: "Error message",
    // "QUERY_FAILED" | "ABORTED" | "TOO_MANY_RESULTS" | "MAP_FAILED"
    code: "QUERY_FAILED",
  },
});

failureResult.isError(); // 👈 true
failureResult.error; // 👈 QError
failureResult.data; // 👈 undefined
```

#### Helpers

```typescript
// 👇 Maps each row, or the single row for queryOne() results (null is kept)
result.map((row) => {
  return { ...row, name: row.name.toUpperCase() };
});
```

> **Deprecated**: `result.getOrThrow()` will be removed, use the datasource throwing methods instead (`ds.queryOrThrow(query)`, `ds.queryOneOrThrow(query, { defaultValue: null })`) or check `error` / `isError()`.

### QErrors

Errors thrown by the datasources throwing methods (`queryOrThrow()`, `queryOneOrThrow()`, `stream()`), usable with `instanceof` (even across realms and duplicated installs) and as types. They carry a suggested http `statusCode`, recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`.

| Error | When | `code` | `statusCode` |
| --- | --- | --- | --- |
| `QErrors.QueryFailed` | the query failed, the driver error as `cause` | `QUERY_FAILED` | 500 |
| `QErrors.Aborted` | the query was aborted, the abort reason as `cause` | `ABORTED` | 504 on timeout, 499 otherwise |
| `QErrors.NoResult` | `queryOneOrThrow()` got no row | `NO_RESULT` | 404 |
| `QErrors.TooManyResults` | more than one row, with `rowCount` | `TOO_MANY_RESULTS` | 500 |
| `QErrors.RolledBack` | `tx.rollback()` was called in a transaction | `ROLLED_BACK` | 500 |
| `QErrors.TransactionConflict` | a transaction conflicts with a concurrent one (serialization failure, deadlock), can be retried | `TRANSACTION_CONFLICT` | 409 |
| `QErrors.TransactionFailed` | a query failed in a transaction (handled by the callback), or it couldn't begin, commit or roll back, the driver error as `cause` | `TRANSACTION_FAILED` | 500 |

```typescript
import { QErrors } from "@flowblade/core"; // or from the datasource package

try {
  const { data: product } = await ds.queryOneOrThrow(query);
} catch (e) {
  if (e instanceof QErrors.QueryFailed) {
    // e.statusCode === 500, e.cause is the driver error
  }
  if (e instanceof QErrors.NoResult) {
    // no row, e.statusCode === 404
  }
  if (e instanceof QErrors.TooManyResults) {
    // more than one row, e.statusCode === 500
    console.error(`Expected one row, got ${e.rowCount}`);
  }
  throw e;
}
```

### Transactions

Datasources supporting transactions implement `TransactionalDatasourceInterface`: `transaction()` (returns a QResult, never throws) and `transactionOrThrow()`. The callback receives a datasource running its queries in the transaction, committed when the callback returns and rolled back when it throws or calls `tx.rollback()`.

| `error.code` (`transaction()`) | When | Thrown by `transactionOrThrow()` |
| --- | --- | --- |
| `ROLLED_BACK` | the callback threw or called `tx.rollback()`, the thrown error as `cause` | the thrown error, as is |
| `TRANSACTION_FAILED` | a query failed (handled by the callback, ie: `tx.query()`), or couldn't begin, commit or roll back, the driver error as `cause` | `QErrors.TransactionFailed` |
| `TRANSACTION_CONFLICT` | conflicts with a concurrent transaction (serialization failure, deadlock), retried with the `retry` option | `QErrors.TransactionConflict` |
| `ABORTED` | aborted with `signal` (never committed), the abort reason as `cause` | `QErrors.Aborted` |

The result `meta` holds a `transaction` span (`status`, begin/commit time) followed by the spans of the queries run in the transaction.

`TransactionalDatasourceInterface` defaults `tx` to `TransactionDatasourceInterface`, for code working with any datasource. Datasources supporting savepoints (ie: Kysely) add `tx.savepoint()` / `tx.savepointOrThrow()` (`TransactionSavepointInterface`), with a `savepoint` span.

```typescript
import type { TransactionalDatasourceInterface } from "@flowblade/core";

const runAll = (ds: TransactionalDatasourceInterface, queries: unknown[]) =>
  ds.transactionOrThrow(async (tx) => {
    for (const query of queries) {
      await tx.queryOrThrow(query);
    }
  });
```

### Implementing a datasource

Helpers to implement a datasource (`DatasourceInterface`) are exported from `@flowblade/core/datasource`: `createQResultSuccess()`, `createQResultError()`, `createSqlSpan()`, `toOneRowQResult()` (for `queryOne()`) and `getOneRowOrThrow()` (for `queryOneOrThrow()`). Use `runTransaction()` to implement `transaction()`: provide `begin`, `commit` and `rollback`, it handles the flow, errors and meta.

```typescript
import { QMeta } from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
} from "@flowblade/core/datasource";

const span = createSqlSpan({ sql, params });
try {
  const rows = await driver.execute(sql, params);
  return createQResultSuccess(rows, new QMeta({ name, spans: span }));
} catch (error) {
  return createQResultError(
    { message: String(error), code: "QUERY_FAILED", cause: error },
    new QMeta({ name, spans: span })
  );
}
```

## Bundle size

Bundle size is tracked by a [size-limit configuration](https://github.com/belgattitude/flowblade/blob/main/packages/core/.size-limit.ts) (minified and brotli compressed, bundled with rolldown).

| Scenario (esm)                               | Size (compressed) |
| -------------------------------------------- | ----------------: |
| `import * from '@flowblade/core'`            |         ~ 4.17 kB |
| `import { QResult } from '@flowblade/core'`  |         ~ 3.98 kB |
| `import * from '@flowblade/core/datasource'` |         ~ 4.35 kB |

## Compatibility

| Level | CI | Description |
| --- | --- | --- |
| Node | ✅ | Requires 22.18+, CI for 22.x, 24.x & 26.x |
| Bun | ✅ | Bun 1.4+, unit tests run on CI with the latest Bun |
| Deno | ✅ | Deno LTS, unit tests run on CI with Deno 2 |
| Browserslist | ✅ | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/core/.browserslistrc) |
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
