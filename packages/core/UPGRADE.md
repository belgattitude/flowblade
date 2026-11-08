# Upgrade guide: @flowblade/core

Breaking changes and how to migrate, by version. See the [CHANGELOG](./CHANGELOG.md) for all changes.

## Unreleased

> **Note**: no runtime behavior changes. Query and transaction result types are more specific, and expected domain rollbacks now have a dedicated error class.

### Transaction domain rollbacks and narrowed transaction errors

Throw `QErrors.DomainRollback` from a transaction callback when a business rejection should roll back the transaction. `transaction()` reports `DOMAIN_ROLLBACK`; `transactionOrThrow()` rethrows that same error instance. The result type is now `TransactionQError`, a discriminated union: check `error.code` before reading domain-only fields.

```typescript
import { QErrors } from "@flowblade/core";

class OutOfStockError extends QErrors.DomainRollback {
  override readonly name = "OutOfStockError";

  constructor(readonly productId: number) {
    super("OUT_OF_STOCK", { productId });
  }
}

const { data, error } = await ds.transaction(async (tx) => {
  const { data: order } = await tx.queryOneOrThrow(createOrder);
  if (order.stock < 1) {
    throw new OutOfStockError(order.id);
  }
  await tx.queryOrThrow(decrementStock(order.id));
  return order.id;
});

if (error?.code === "DOMAIN_ROLLBACK") {
  console.log(error.reason, error.details);
  if (error.cause instanceof OutOfStockError) {
    console.log(error.cause.productId);
  }
} else if (error) {
  // Other transaction failures: ROLLED_BACK, TRANSACTION_FAILED,
  // TRANSACTION_CONFLICT, or ABORTED.
  throw error.cause;
} else {
  console.log(data); // committed
}
```

For exception-style handling, `transactionOrThrow()` rethrows the same custom instance:

```typescript
try {
  await ds.transactionOrThrow(async () => {
    throw new OutOfStockError(7);
  });
} catch (error) {
  if (error instanceof OutOfStockError) {
    console.log(error.productId);
  } else {
    throw error;
  }
}
```

`details` should be serializable if it crosses a process boundary. In `transaction()` results, `cause` is runtime-only and may be absent after serialization; use `reason` and `details` for portable handling.

### Query errors narrow by operation and code

The broad `QError` shape remains available for generic code. Datasource `query()` and `queryOne()` now return `QueryQError` and `QueryOneQError`, respectively. This lets TypeScript narrow the error variant by `code`. `AbortedQError.cause` is `unknown`, matching `AbortSignal.reason`, which may be any JavaScript value. `QResult.map()` preserves its input errors and adds `MapFailedQError`.

```typescript
const { error } = await ds.query(query, { signal });
if (error?.code === "ABORTED") {
  // error is AbortedQError; cause may be a DOMException, Error, string, etc.
  console.log(error.cause);
}

const one = await ds.queryOne(query, { signal });
if (one.error?.code === "TOO_MANY_RESULTS") {
  console.log(one.error.cause);
}
```

Most callers need no changes: inferred results now provide better narrowing, and `QError` itself remains unchanged. Update explicit method-result types and custom datasource implementations to use `QueryQError` for `query()`, `QueryOneQError` for `queryOne()`, and `TransactionQError` for `transaction()`. When writing generic code that intentionally accepts any Flowblade error, continue to use `QError`.

## 0.8.0

> **Note**: no breaking change, `QResult.getOrThrow()` is deprecated and will be removed in a future release.

### `QResult.getOrThrow()` is deprecated

Use the datasource throwing methods instead: by default they throw the same errors (`QErrors.QueryFailed`, `QErrors.Aborted`, `QErrors.TooManyResults`) and they also apply the datasource `defaultOptions` error factories (see the warning below).

**Migrate**:

```typescript
// Before
const rows = (await ds.query(query)).getOrThrow();
const row = (await ds.queryOne(query)).getOrThrow();

// After
const { data: rows } = await ds.queryOrThrow(query);
// 👇 defaultValue: null keeps returning null when there's no row,
//    without it a QErrors.NoResult is thrown
const { data: row } = await ds.queryOneOrThrow(query, { defaultValue: null });
```

Error factories move to the throwing methods options, `onError` / `onTooManyResults` keep the same signature:

```typescript
// Before
const row = (await ds.queryOne(query)).getOrThrow({
  onError: ({ error }) => new HttpInternalServerError({ cause: error }),
});
// After
const { data: row } = await ds.queryOneOrThrow(query, {
  defaultValue: null,
  onError: ({ error }) => new HttpInternalServerError({ cause: error }),
});
```

> **Warning**: `getOrThrow()` ignored the datasource `defaultOptions`, the throwing methods apply them. If your datasource sets `defaultOptions.queryOrThrow` / `defaultOptions.queryOneOrThrow` factories, the migrated calls throw your factories errors instead of `QErrors.QueryFailed`, `QErrors.Aborted` or `QErrors.TooManyResults` (ie: `instanceof QErrors.*` checks, `toThrow()` assertions). To keep the previous errors, return the default error from the factories:
>
> ```typescript
> const { data: row } = await ds.queryOneOrThrow(query, {
>   defaultValue: null,
>   onError: ({ error }) => error,
>   onTooManyResults: ({ error }) => error,
> });
> ```

The function form (`getOrThrow((qError) => new Error(qError.message))`) has no direct equivalent: use `onError`, which receives the `qError` too.

For other results (ie: after `map()`, or built by hand), check `error` / `isError()` before accessing `data`.

**Custom datasources**: use the new `getDataOrThrow()` from `@flowblade/core/datasource` to implement `queryOrThrow()`.

```typescript
// Before
return { data: result.getOrThrow({ onError }), meta: result.meta };
// After
import { getDataOrThrow } from "@flowblade/core/datasource";
return { data: getDataOrThrow(result, { onError }), meta: result.meta };
```

## 0.7.0

> **Note**: this release contains small breaking changes, listed below. They mostly affect custom datasources, code matching error messages and results built by hand.

### Datasource helpers moved to `@flowblade/core/datasource`

The helpers to implement a datasource are no longer exported from `@flowblade/core`: `createQResultSuccess()`, `createQResultError()` and `createSqlSpan()`. The new `toOneRowQResult()` and `getOneRowOrThrow()` (to implement `queryOne()` / `queryOneOrThrow()`) are exported there too.

**Migrate**: import them from `@flowblade/core/datasource` (ie: custom datasources, tests building results by hand).

```typescript
// Before
import { createQResultError, QMeta } from "@flowblade/core";
// After
import { QMeta } from "@flowblade/core";
import { createQResultError } from "@flowblade/core/datasource";
```

### `QError.code` is required

Every `QError` now has a `code`, so errors can be handled with a `switch`:

| Code | Meaning | `cause` |
| --- | --- | --- |
| `QUERY_FAILED` | the query failed | the driver error |
| `ABORTED` | the query was aborted with its `signal` | the abort reason (ie: a TimeoutError) |
| `TOO_MANY_RESULTS` | `queryOne()` got more than one row | a `QErrors.TooManyResults` |
| `MAP_FAILED` | the `QResult.map()` transform threw | the thrown error |

**Migrate**: QErrors built by hand (ie: tests, custom datasources, `createQResultError()`) must set a `code`.

```typescript
// Before
createQResultError({ message: "Failed", cause: error }, meta);
// After
createQResultError(
  { message: "Failed", code: "QUERY_FAILED", cause: error },
  meta
);
```

`QResult.toJsonifiable()` includes the `code`: strict comparisons of the serialized error (ie: snapshots, `toStrictEqual()`) need it too.

### `QResult.getOrThrow()` throws `QErrors`

Without a custom error function, `getOrThrow()` used to throw a plain `Error` with the QError message. It now throws, depending on the `code`:

| Code | Thrown error | Message |
| --- | --- | --- |
| `QUERY_FAILED` | `QErrors.QueryFailed` (`statusCode` 500) | `"Query failed: <message>"` |
| `ABORTED` | `QErrors.Aborted` (`statusCode` 504 on timeout, 499 otherwise) | `"Query aborted: <message>"` |
| `TOO_MANY_RESULTS` | the `QErrors.TooManyResults` cause itself | unchanged |
| `MAP_FAILED` | a plain `Error` (as before) | unchanged |

They all extend `Error` and keep the original `cause`.

**Migrate**: code matching the thrown message must account for the `"Query failed: "` / `"Query aborted: "` prefixes. Prefer `instanceof`:

```typescript
import { QErrors } from "@flowblade/core";

try {
  result.getOrThrow();
} catch (e) {
  // Before: e.message === "Table not found"
  if (e instanceof QErrors.QueryFailed) {
    // e.message === "Query failed: Table not found", e.cause is the driver error
  }
}
```

### `QResult.isError()` is a method

`isOk()` and `isError()` are now type guards narrowing `data` and `error`, like checking `error`. To support it, `isError` changed from an arrow function property to a method, like `isOk()`.

**Migrate**: only unbound uses are affected, ie: `const { isError } = result; isError()` or passing `result.isError` as a callback. Call it on the result instead: `result.isError()`.

### `QResult` data can be a single row

`QResult` data was always an array of rows. It now holds the rows (`query()`: `QResult<Row[]>`) or a single row or null (`queryOne()`: `QResult<Row | null>`).

**Migrate**: generic code constrained to arrays must widen the constraint to accept both shapes. `query()` results are unchanged.

```typescript
// Before
const toJson = <T extends QResult<unknown[], QError>>(result: T) => {};
// After
const toJson = <T extends QResult<unknown, QError>>(result: T) => {};
```

### `QResult` is a discriminated union

Checking `error` narrows `data`, even after destructuring. As a consequence, `QResult.map()` returns `QResult<TMappedRow[], TError | QError>` instead of `QResult<TMappedRow[] | undefined, TError | undefined>`.

**Migrate**: explicit type annotations of `map()` results must be updated. Code checking `data` for undefined after checking `error` keeps working, the check is just no longer needed.
