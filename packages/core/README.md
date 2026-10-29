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

// 👇 Throws depending on the error code: QErrors.QueryFailed ("QUERY_FAILED"),
// QErrors.Aborted ("ABORTED"), QErrors.TooManyResults ("TOO_MANY_RESULTS")
result.getOrThrow();
// 👇 Throw your own errors, the default error is available as cause
result.getOrThrow({
  // query failures (switch on qError.code if needed, ie: "ABORTED")
  onError: ({ error, qError, meta }) =>
    new HttpInternalServerError({ cause: error }),
  // more than one row (queryOne() results)
  onTooManyResults: ({ error, rowCount, meta }) =>
    new HttpInternalServerError({
      message: `Expected one row, got ${rowCount}`,
      cause: error,
    }),
});
// 👇 Or with a function receiving the QError
result.getOrThrow((qErr) => {
  return new HttpServiceUnavailable({
    cause: new Error(qErr.message),
  });
});
```

### QErrors

Errors thrown by the datasources throwing methods (`queryOrThrow()`, `queryOneOrThrow()`, `stream()`) and `QResult.getOrThrow()`, usable with `instanceof` (even across realms and duplicated installs) and as types. They carry a suggested http `statusCode`, recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`.

| Error | When | `code` | `statusCode` |
| --- | --- | --- | --- |
| `QErrors.QueryFailed` | the query failed, the driver error as `cause` | `QUERY_FAILED` | 500 |
| `QErrors.Aborted` | the query was aborted, the abort reason as `cause` | `ABORTED` | 504 on timeout, 499 otherwise |
| `QErrors.NoResult` | `queryOneOrThrow()` got no row | `NO_RESULT` | 404 |
| `QErrors.TooManyResults` | more than one row, with `rowCount` | `TOO_MANY_RESULTS` | 500 |

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

### Implementing a datasource

Helpers to implement a datasource (`DatasourceInterface`) are exported from `@flowblade/core/datasource`: `createQResultSuccess()`, `createQResultError()`, `createSqlSpan()`, `toOneRowQResult()` (for `queryOne()`) and `getOneRowOrThrow()` (for `queryOneOrThrow()`).

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
