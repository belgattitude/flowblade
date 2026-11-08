# @flowblade/core

## 0.10.0

### Minor Changes

- [`c0f25c3`](https://github.com/belgattitude/flowblade/commit/c0f25c31bfdee8e95ff5bc567a2b6fcaa1512bbc) Thanks [@belgattitude](https://github.com/belgattitude)! - Change `QErrors.DomainRollback` to accept the native `Error` options bag as its second parameter, including `{ cause }`. Domain metadata moves to `options.details`.
  
  ```typescript
  // Before
  throw new QErrors.DomainRollback("OUT_OF_STOCK", { productId: 7 });
  
  // After
  throw new QErrors.DomainRollback("OUT_OF_STOCK", {
    details: { productId: 7 },
    cause: validationError,
  });
  ```
  
  `QErrors.NoResult` accepts `ErrorOptions` as its first parameter, and `QErrors.TooManyResults` accepts it as its second parameter. All custom Flowblade errors now accept native error options, allowing causes to be passed consistently.

- [#1514](https://github.com/belgattitude/flowblade/pull/1514) [`20a0c9b`](https://github.com/belgattitude/flowblade/commit/20a0c9b1b77ae1101109a87c441ce53ad7e36b82) Thanks [@belgattitude](https://github.com/belgattitude)! - Add `QErrors.DomainRollback` for expected domain rejections that must abort a transaction, separate from unexpected callback and database failures. The non-throwing `transaction()` reports `DOMAIN_ROLLBACK` with the stable `reason`, serializable `details`, and original error as `cause`. `transactionOrThrow()` rethrows the same error instance, so application subclasses remain usable with `instanceof` when their constructors are shared. Across duplicate package copies or realms, use `instanceof QErrors.DomainRollback`; custom subclass constructors are not shared.
  
  ```typescript
  import { QErrors } from "@flowblade/core";
  
  class OutOfStockError extends QErrors.DomainRollback {
    override readonly name = "OutOfStockError";
  
    constructor(
      readonly productId: number,
      options?: ErrorOptions
    ) {
      super("OUT_OF_STOCK", { ...options, details: { productId } });
    }
  }
  
  // Return-style: inspect the transaction error code.
  const { data, error } = await ds.transaction(async (tx) => {
    const { data: order } = await tx.queryOneOrThrow(createOrder);
    if (order.stock < 1) {
      throw new OutOfStockError(order.id);
    }
    await tx.queryOrThrow(decrementStock(order.id));
    return order.id;
  });
  
  if (error?.code === "DOMAIN_ROLLBACK") {
    // reason/details are available on the transaction error.
    console.log(error.reason, error.details);
    // The original custom class is retained at runtime.
    if (error.cause instanceof OutOfStockError) {
      console.log(error.cause.productId);
    }
  } else if (error) {
    // Other transaction failures are not domain rejections.
    throw error.cause;
  } else {
    console.log(data); // committed
  }
  
  // Exception-style: transactionOrThrow() rethrows the same instance.
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
  
  Keep `details` serializable if results cross a process boundary. In `transaction()` results, `cause` is runtime-only and may be absent after serialization; `reason` and `details` are the portable classification.

- [`c0f25c3`](https://github.com/belgattitude/flowblade/commit/c0f25c31bfdee8e95ff5bc567a2b6fcaa1512bbc) Thanks [@belgattitude](https://github.com/belgattitude)! - Return transaction failures as error class instances so `transaction()` results can be checked with `instanceof`. Add `QErrors.TransactionDomainRollback`, which extends `QErrors.DomainRollback` and preserves the original domain error as its cause. `TransactionQError` now reflects the concrete error classes; `QResult.toJsonifiable()` continues to return the serializable QError fields and message without the runtime cause.
  
  ```typescript
  import { QErrors } from "@flowblade/core";
  
  const { error } = await ds.transaction(async () => {
    throw new QErrors.DomainRollback("OUT_OF_STOCK", {
      details: { productId: 7 },
    });
  });
  
  if (error instanceof QErrors.TransactionDomainRollback) {
    console.log(error.reason, error.details);
    console.log(error.cause instanceof QErrors.DomainRollback);
  } else if (error instanceof QErrors.TransactionConflict) {
    // Retry or report the transient conflict.
  }
  ```

- [#1514](https://github.com/belgattitude/flowblade/pull/1514) [`20a0c9b`](https://github.com/belgattitude/flowblade/commit/20a0c9b1b77ae1101109a87c441ce53ad7e36b82) Thanks [@belgattitude](https://github.com/belgattitude)! - Narrow the `transaction()` result to the exported `TransactionQError` union. Checking its `code` now narrows transaction-specific fields; the `DOMAIN_ROLLBACK` variant has `reason`, `details`, and an optional typed `QErrors.DomainRollback` cause. The generic `QError` type remains broad.
  
  ```typescript
  const { data, error } = await ds.transaction(async (tx) => {
    await tx.queryOrThrow(query);
    return "committed";
  });
  
  if (error?.code === "DOMAIN_ROLLBACK") {
    console.log(error.reason, error.details);
    // `cause` is runtime-only and may be absent from deserialized results.
  } else if (error?.code === "TRANSACTION_CONFLICT") {
    // A transient conflict may be retried according to transaction options.
  } else if (error) {
    // ROLLED_BACK, TRANSACTION_FAILED, or ABORTED.
    console.error(error.code, error.cause);
  } else {
    console.log(data);
  }
  ```
  
  This is a type-level refinement of the transaction result. Runtime transaction behavior and the meaning of the existing error codes are unchanged.

- [#1514](https://github.com/belgattitude/flowblade/pull/1514) [`20a0c9b`](https://github.com/belgattitude/flowblade/commit/20a0c9b1b77ae1101109a87c441ce53ad7e36b82) Thanks [@belgattitude](https://github.com/belgattitude)! - Add discriminated query error types: `query()` returns `QueryQError`, and `queryOne()` returns `QueryOneQError`. Checking `error.code` narrows query failures, aborts, and multiple-row errors without changing the broad `QError` type. An `ABORTED` error is an `AbortedQError`; its `cause` remains `unknown` because `AbortSignal.reason` can be any JavaScript value. `QResult.map()` preserves the original variants and adds `MapFailedQError`.
  
  ```typescript
  const { error } = await ds.query(query, { signal });
  if (error?.code === "ABORTED") {
    // error is AbortedQError. Do not assume its cause is an Error or DOMException.
    console.log(error.cause);
  }
  
  const one = await ds.queryOne(query, { signal });
  if (one.error?.code === "TOO_MANY_RESULTS") {
    // QueryOneQError discriminates this from a query failure or abort.
    console.log(one.error.cause);
  }
  
  const mapped = one.map((row) => ({ id: String(row.id) }));
  if (mapped.error?.code === "ABORTED") {
    // Abort narrowing is retained after map().
    console.log(mapped.error.cause);
  }
  ```
  
  The thrown `QErrors.Aborted` wrapper and runtime abort behavior are unchanged; the original signal reason is still available as `cause`.

## 0.9.1

### Patch Changes

- [#1506](https://github.com/belgattitude/flowblade/pull/1506) [`a87fc98`](https://github.com/belgattitude/flowblade/commit/a87fc98aac78e75cbe2dff371b626cb6d1cd20ba) Thanks [@belgattitude](https://github.com/belgattitude)! - Update @httpx/plain-object and @httpx/dsn-parser internal deps to latest to reduce install size (esm only)

## 0.9.0

### Minor Changes

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Add transactions: `transaction()` (returns a QResult) and `transactionOrThrow()`, the callback receives a datasource running its queries in the transaction.
  
  ```typescript
  const {
    data: orderId,
    error,
    meta,
  } = await ds.transaction(
    async (tx) => {
      // insertOrder returns the inserted row (ie: RETURNING id)
      const { data: order } = await tx.queryOneOrThrow(insertOrder);
      await tx.queryOrThrow(insertOrderLines(order.id));
      return order.id;
    },
    {
      name: "createOrder",
      isolationLevel: "serializable",
      // serialization failures are expected, run it again on conflict
      retry: { maxRetries: 3 },
    }
  );
  ```
  
  - Committed when the callback returns, rolled back when it throws or calls `tx.rollback(reason)`.
  - `transaction()` error codes: `ROLLED_BACK` (the thrown error as cause), `TRANSACTION_FAILED` (begin, commit or rollback failed), `TRANSACTION_CONFLICT` (conflicts with a concurrent transaction, after the `retry` attempts) and `ABORTED` (with `signal`, never committed).
  - `transactionOrThrow()` rethrows the callback error as is, or throws `QErrors.TransactionFailed` / `QErrors.TransactionConflict` / `QErrors.Aborted`, an `onError` factory can replace them.
  - The result meta holds a new `transaction` span (`QMetaTransactionSpan`) followed by the spans of the queries run in the transaction.
  
  Core: add `TransactionalDatasourceInterface`, `QErrors.RolledBack`, `QErrors.TransactionFailed`, the `ROLLED_BACK` / `TRANSACTION_FAILED` error codes and `runTransaction()` in `@flowblade/core/datasource` to implement `transaction()` in datasources.

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Add transaction conflicts and retries.
  
  - New `TRANSACTION_CONFLICT` error code and `QErrors.TransactionConflict` (409): the transaction conflicts with a concurrent one (serialization failure, deadlock), thrown by `transactionOrThrow()`.
  - New `retry` option: `ds.transaction(fn, { retry: { maxRetries: 3 } })` runs the transaction again on conflict (exponential backoff with jitter by default: 25-50ms, 50-100ms, 100-200ms... up to 500ms-1s, or `delayMs`), the transaction span gets `retries`.
  - `@flowblade/source-kysely`: recognizes the Postgres ("40001", "40P01"), SQL Server (1205, 3960) and MySQL (1213) conflicts, the new `isTransactionConflict` param replaces the detection.
  - `@flowblade/source-duckdb`: recognizes the DuckDB conflicts ("TransactionContext Error: ... conflict").
  - `@flowblade/core`: `runTransaction()` takes `isConflictError` and `onRetry`, and `TransactionBeginContext.assertActive()` rejects the queries of a transaction datasource used after its callback ended.

- [#1502](https://github.com/belgattitude/flowblade/pull/1502) [`a7def54`](https://github.com/belgattitude/flowblade/commit/a7def54ef0a4e635cc3382b7b1d60bc4512978c2) Thanks [@belgattitude](https://github.com/belgattitude)! - Set the transaction retry policy in the datasource constructors, and configure the backoff jitter.
  
  ```typescript
  import { createExponentialBackoff } from "@flowblade/core";
  
  const ds = new KyselyDatasource({
    connection: db,
    defaultOptions: {
      transaction: {
        retry: {
          maxRetries: 3,
          // 0-100ms, 0-200ms then 0-400ms
          delayMs: createExponentialBackoff({
            initialDelayMs: 100,
            maxDelayMs: 2000,
            jitter: "full",
          }),
        },
      },
    },
  });
  ```
  
  - New `defaultOptions.transaction.retry` datasource param (`TransactionDefaultOptions`), used by `transaction()` and `transactionOrThrow()`: the `retry` fields passed per transaction win (ie: `{ maxRetries: 0 }` disables the retries, a per transaction `maxRetries` keeps the default `delayMs`).
  - `@flowblade/core`: new `createExponentialBackoff({ initialDelayMs, maxDelayMs, jitter })` retry delay factory (defaults: 50ms, 1s, `"equal"`), `jitter` is `"equal"` (half of the delay is random), `"full"` (the whole delay) or `"none"`. `runTransaction()` takes a `defaultRetry` param.

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - A failed query in a transaction is never committed, even when handled by the callback (ie: `tx.query()` never throws, or a caught `tx.queryOrThrow()`): the transaction is rolled back with a `TRANSACTION_FAILED` error, the first query error as `cause`.
  
  Most databases abort the transaction on error and silently roll back on commit (ie: Postgres, DuckDB), the transaction would otherwise be reported as committed.
  
  `runTransaction()` handles it for all the datasources: `begin` receives a `TransactionBeginContext` with `onQueryFailed()`, to call (like `addSpan()`) for each failed query of the transaction datasource.

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Transactions wait for the queries not awaited by the callback, and log in core.
  
  - A query started in the callback but not awaited (a bug) now always ends before the commit or rollback, rather than racing it.
  - `@flowblade/core`: `TransactionBeginContext.trackQuery()` (for the datasources to report their queries), and `runTransaction()` logs the transactions with its `log: { logger, source }` param (begin, retries, result), the datasources no longer duplicate it.
  - `@flowblade/source-duckdb`: a query waiting for a transaction on its connection no longer counts the wait in its span `timeMs`, the wait is logged ("waited {lockWaitMs}ms for a transaction").

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Add savepoints, the `onFailedQuery` option and a default transaction datasource type.
  
  - `@flowblade/source-kysely`: `tx.savepoint()` / `tx.savepointOrThrow()`, a part of the transaction rolled back alone (when the callback throws or a query failed in it, unless `onFailedQuery` is "commit": the savepoint is then released), the transaction goes on. `tx.savepointOrThrow()` rethrows after rolling back the savepoint: catch the error for the transaction to go on. Nested savepoints are supported, SQL Server savepoints end with the transaction (no RELEASE).
  - New `onFailedQuery: "rollback" | "commit"` transaction option: "commit" commits after a failed query handled by the callback, for SQL Server or MySQL (a conflict is never committed). Not available on DuckDB, which always aborts the transaction on a failed query.
  - `@flowblade/core`: `TransactionalDatasourceInterface` defaults its transaction datasource to the new `TransactionDatasourceInterface`, add `TransactionSavepointInterface`, `runSavepoint()` and the `savepoint` span (`QMetaSavepointSpan`).

### Patch Changes

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Add DuckDB transactions: `transaction()` (returns a QResult) and `transactionOrThrow()`, like the Kysely datasource.
  
  - The transaction holds the connection: the queries and streams of the datasources sharing the connection wait for it to end, and it waits for the running ones before beginning (aborting with `signal` stops waiting).
  - DuckDB aborts the transaction on any failed query and would silently roll back on commit: after a failed query (ie: `tx.query()` or a caught `tx.queryOrThrow()`), the transaction is rolled back with a `TRANSACTION_FAILED` error.
  - Supports `accessMode: "read only"`, DuckDB has no isolation levels nor nested transactions.
  
  Core: `runTransaction()` returns an `ABORTED` error (rather than `TRANSACTION_FAILED`) when aborted while beginning, ie: waiting for a connection.

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Transaction race fixes.
  
  - `@flowblade/core`: a transaction aborted by the synchronous part of `begin` is rolled back once (it was rolled back twice).
  - `@flowblade/source-duckdb`: a `withConnectionLock()` callback run in a transaction callback is waited for before the commit or rollback, even when not awaited (it could run after the transaction ended, outside of it).

- [#1502](https://github.com/belgattitude/flowblade/pull/1502) [`a7def54`](https://github.com/belgattitude/flowblade/commit/a7def54ef0a4e635cc3382b7b1d60bc4512978c2) Thanks [@belgattitude](https://github.com/belgattitude)! - The default transaction `retry` delay is an exponential backoff with jitter: half of the delay is random (25-50ms, 50-100ms, 100-200ms... up to 500ms-1s), to spread the retries of concurrent conflicting transactions (they'd otherwise retry at the same time and conflict again).

- [#1500](https://github.com/belgattitude/flowblade/pull/1500) [`8e4fcc4`](https://github.com/belgattitude/flowblade/commit/8e4fcc4e7ccd6e2a4b820c7c35534e62d68408db) Thanks [@belgattitude](https://github.com/belgattitude)! - Transaction fixes.
  
  - `@flowblade/core`: an aborted transaction no longer waits for `begin` (ie: a connection of an exhausted pool, a lock): it returns "ABORTED" at once, a transaction begun after the abort is rolled back and the callback never runs.
  - `@flowblade/source-kysely`: `tx.stream()` runs in the transaction even with a query built with `ds.queryBuilder` (it used the builder connection, outside the transaction).
  - `@flowblade/source-duckdb`: only the known DuckDB conflict messages are reported as "TRANSACTION_CONFLICT" (not a constraint violation on a key containing "conflict"), the connection lock is released even when closing a stream fails. Add `isInConnectionTransaction(conn)`.
  - `@flowblade/sqlduck`: the loads run in a `DuckdbDatasource` transaction callback skip their checkpoints (DuckDB can't checkpoint in a transaction, the transaction failed).

## 0.8.0

### Minor Changes

- [#1498](https://github.com/belgattitude/flowblade/pull/1498) [`6508565`](https://github.com/belgattitude/flowblade/commit/65085659d912b2183abf91aef2137bb5a8608775) Thanks [@belgattitude](https://github.com/belgattitude)! - Deprecate `QResult.getOrThrow()`, use the datasource throwing methods instead (they throw the same errors and support the `defaultOptions` error factories):
  
  - `ds.queryOrThrow(query)` instead of `(await ds.query(query)).getOrThrow()`
  - `ds.queryOneOrThrow(query, { defaultValue: null })` instead of `(await ds.queryOne(query)).getOrThrow()`
  
  Add `getDataOrThrow(result, factories)` to `@flowblade/core/datasource`, used by the datasources to implement `queryOrThrow()`.

## 0.7.0

### Minor Changes

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - Move the helpers to implement a datasource to a dedicated `@flowblade/core/datasource` entry, to keep the main entry focused on what datasource users need (`import * from "@flowblade/core"`: ~4.43 kB → ~4.17 kB).
  
  Moved: `createQResultSuccess()`, `createQResultError()` and `createSqlSpan()`. The new `toOneRowQResult()` and `getOneRowOrThrow()`, to implement `queryOne()` / `queryOneOrThrow()`, are exported there too.
  
  ```typescript
  import { QMeta } from "@flowblade/core";
  import {
    createQResultError,
    createQResultSuccess,
    createSqlSpan,
  } from "@flowblade/core/datasource";
  ```
  
  Breaking change: the moved helpers are no longer exported from `@flowblade/core`, see `UPGRADE.md` to migrate.

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - The throwing methods accept error factories (except `stream()`). `QResult.getOrThrow()` accepts `onError` / `onTooManyResults`, in the same style as `queryOneOrThrow()`. Each factory receives the default error (ie: `QErrors.QueryFailed`), useful as `cause`.
  
  - `onTooManyResults({ error, rowCount, meta })`: the result has more than one row (`queryOne()` results).
  - `onError({ error, qError, meta })`: the other failures, ie: the query failed (`"QUERY_FAILED"`, `"ABORTED"`) or the `map()` transform threw. Switch on `qError.code` if needed.
  
  ```typescript
  import { HttpInternalServerError } from "@httpx/exception";
  
  const row = (await ds.queryOne(query)).getOrThrow({
    onError: ({ error }) => new HttpInternalServerError({ cause: error }),
    onTooManyResults: ({ error, rowCount }) =>
      new HttpInternalServerError({
        message: `Expected one row, got ${rowCount}`,
        cause: error,
      }),
  });
  ```
  
  `queryOrThrow()` and `queryOneOrThrow()` accept an `onError` factory too, per query or as datasource defaults (`defaultOptions.queryOrThrow` / `defaultOptions.queryOneOrThrow`). All the throwing methods share the same factories:
  
  | Method | Factories | Datasource defaults |
  | --- | --- | --- |
  | `queryOrThrow()` | `onError` | `defaultOptions.queryOrThrow` |
  | `queryOneOrThrow()` | `onError`, `onNoResult`, `onTooManyResults` | `defaultOptions.queryOneOrThrow` |
  | `QResult.getOrThrow()` | `onError`, `onTooManyResults` |  |
  
  ```typescript
  import { HttpGatewayTimeout, HttpInternalServerError } from "@httpx/exception";
  
  const onError = ({ error, qError }) =>
    qError.code === "ABORTED"
      ? new HttpGatewayTimeout({ cause: error })
      : new HttpInternalServerError({ cause: error });
  
  const ds = new DuckdbDatasource({
    connection: duckdb,
    defaultOptions: {
      queryOrThrow: { onError },
      queryOneOrThrow: { onError },
    },
  });
  ```
  
  Passing a function receiving the `QError` to `getOrThrow()` still works: `result.getOrThrow((qErr) => new Error(qErr.message))`.
  
  New types: `QErrorFactory`, `QGetOrThrowErrorFactories` and `QueryOrThrowOptions`.

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - `QResult` is now a discriminated union: checking `error` narrows `data` (and the other way around), even after destructuring.
  
  ```typescript
  const { data, error } = await ds.query(sql<{ id: number }>`SELECT 1 as id`);
  if (error) {
    return console.error(error.message);
  }
  // data is typed { id: number }[], no longer `| undefined`
  ```
  
  `QResult.map()` keeps the union too: mapping rows returns `QResult<TMappedRow[], TError | QError>` instead of `QResult<TMappedRow[] | undefined, TError | undefined>`.

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - `QResult` data is no longer always an array. It holds either:
  
  - the rows, for `query()`: `QResult<Row[]>`,
  - the row or `null`, for `queryOne()`: `QResult<Row | null>`.
  
  The API stays the same for both:
  
  - `map()` transforms each row of an array, or the single row (`null` is kept as is, the transform isn't called).
  - `InferQResult` infers the data type: `Row[]` or `Row | null`.
  - `getOrThrow()` and `toJsonifiable()` return the data as is (ie: `data: null` for a missing row).
  
  ```typescript
  import type { InferQResult } from "@flowblade/core";
  
  type Row = { id: number; name: string };
  
  const result = await ds.queryOne(
    sql<Row>`SELECT id, name FROM product WHERE id = ${id}`
  );
  const { data: product, error } = result;
  if (error) {
    throw new Error(error.message, { cause: error.cause });
  }
  // product: Row | null
  
  type Product = InferQResult<typeof result>; // Row | null
  
  // map() transforms the row, null is kept as is
  const { data: dto } = result.map((row) => {
    return { ...row, slug: slugify(row.name) };
  });
  // dto: (Row & { slug: string }) | null
  ```
  
  **Migration**: `query()` results are unchanged. Only generic code constrained to arrays (ie: `<T extends QResult<unknown[], QError>>`) needs to widen the constraint to `QResult<unknown, QError>` to accept both shapes. `DatasourceHelpers.toJsonified()` from `@flowblade/source-kysely` already accepts both.

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - Consistent errors: every `QError` has a `code`, and every throwing method throws an error from the `QErrors` namespace, usable with `instanceof` and carrying a suggested http `statusCode`. See the `UPGRADE.md` of each package to migrate.
  
  | `QError.code` | Thrown error (`*OrThrow()`, `stream()`, `getOrThrow()`) | `statusCode` |
  | --- | --- | --- |
  | `QUERY_FAILED` (driver error as `cause`) | `QErrors.QueryFailed`, message prefixed with `"Query failed: "` | 500 |
  | `ABORTED` (abort reason as `cause`) | `QErrors.Aborted`, message prefixed with `"Query aborted: "` | 504 on timeout, 499 otherwise |
  | `TOO_MANY_RESULTS` | `QErrors.TooManyResults` | 500 |
  | `MAP_FAILED` (`map()` transform error as `cause`) | `Error` |  |
  
  `queryOneOrThrow()` also throws `QErrors.NoResult` (404) when there's no row.
  
  ```typescript
  import { QErrors } from "@flowblade/source-duckdb";
  
  // Results: switch over the error code
  const { data, error } = await ds.query(query, {
    signal: AbortSignal.timeout(5_000),
  });
  if (error) {
    switch (error.code) {
      case "ABORTED":
        // error.cause is the abort reason, ie: a TimeoutError
        break;
      case "QUERY_FAILED":
        // error.cause is the driver error
        break;
    }
  }
  
  // Throwing methods: use instanceof
  try {
    await ds.queryOrThrow(query, { signal: AbortSignal.timeout(5_000) });
  } catch (e) {
    if (e instanceof QErrors.Aborted) {
      // e.statusCode === 504
    }
    throw e;
  }
  ```
  
  `queryOne().getOrThrow()` and `queryOneOrThrow()` now throw the same errors, except when there's no row (`null` vs `QErrors.NoResult`).
  
  `QResult.isOk()` and `QResult.isError()` are now type guards, narrowing `data` and `error` like checking `error`:
  
  ```typescript
  const result = await ds.query(query);
  if (result.isError()) {
    // result.error: QError, result.data: undefined
    return console.error(result.error.code);
  }
  // result.data: Row[]
  ```
  
  Breaking changes:
  
  - `QError.code` is required: QErrors built by hand (ie: tests, custom datasources) must set it, and `toJsonifiable()` includes it.
  - `QResult.getOrThrow()` throws `QErrors.QueryFailed` / `QErrors.Aborted` (messages prefixed with `"Query failed: "` / `"Query aborted: "`) rather than a plain `Error`, and the `QErrors.TooManyResults` cause itself.
  - `queryOrThrow()` throws `QErrors.Aborted` with a `"Query aborted: "` message when aborted, and `stream()` errors are prefixed with `"Query failed: "` / `"Query aborted: "`.
  - `@flowblade/source-kysely`: the `cause` of an aborted query is the abort reason (`signal.reason`) rather than the dialect error.
  - `QResult.isError` is a method rather than an arrow function property: unbound uses (ie: `const { isError } = result`) must call it on the result.

- [#1456](https://github.com/belgattitude/flowblade/pull/1456) [`d5bb2e1`](https://github.com/belgattitude/flowblade/commit/d5bb2e1d76ff5973821bd3d91c44f7b8437b2f46) Thanks [@belgattitude](https://github.com/belgattitude)! - Add `queryOne()` and `queryOneOrThrow()` to datasources, for queries expecting a single row. More than one row is always an error, protecting against a missing condition or broken data integrity.
  
  | Method | No row | One row | More than one row | Query failure |
  | --- | --- | --- | --- | --- |
  | `queryOne()` | `data: null` | `data: row` | `error.code: "TOO_MANY_RESULTS"` | `error.code: "QUERY_FAILED"` / `"ABORTED"` |
  | `queryOneOrThrow()` | throws `QErrors.NoResult` (or returns `defaultValue`) | `data: row` | throws `QErrors.TooManyResults` | throws `QErrors.QueryFailed` / `QErrors.Aborted` |
  
  #### `queryOne()`, never throws
  
  Like `query()` returns `[]`, an empty result isn't an error: `data` is `null`.
  
  ```typescript
  import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
  
  const query = sql<{ id: number }>`SELECT id FROM product WHERE id = ${id}`;
  
  const { data: product, error } = await ds.queryOne(query);
  if (error) {
    // error.code: "QUERY_FAILED", "ABORTED" or "TOO_MANY_RESULTS"
    throw new Error(error.message, { cause: error.cause });
  }
  if (product === null) {
    // not found, ie: return a 404
  }
  ```
  
  #### `queryOneOrThrow()`, the row must exist
  
  ```typescript
  import { QErrors } from "@flowblade/source-duckdb";
  import { HttpNotFound } from "@httpx/exception";
  
  // Throws QErrors.NoResult or QErrors.TooManyResults
  const { data: product, meta } = await ds.queryOneOrThrow(query);
  
  // Return a default value when there's no row (ie: default settings)
  const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
    defaultValue: defaultSettings,
  });
  
  // Throw your own error
  const { data: brand } = await ds.queryOneOrThrow(brandQuery, {
    onNoResult: ({ error }) =>
      new HttpNotFound({ message: `Brand ${id} not found`, cause: error }),
  });
  
  // Or recognize the flowblade errors
  try {
    await ds.queryOneOrThrow(query);
  } catch (e) {
    if (e instanceof QErrors.TooManyResults) {
      console.error(`Expected one row, got ${e.rowCount}`);
    }
    throw e;
  }
  ```
  
  #### Datasource defaults
  
  The error factories can be set once per datasource with `defaultOptions`, keyed by method name (per query options win):
  
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
  
  #### `QErrors`
  
  `QErrors.NoResult` and `QErrors.TooManyResults` (along with `QErrors.QueryFailed` and `QErrors.Aborted`, see the query errors changeset) are exported under the `QErrors` namespace (from `@flowblade/core`, re-exported by `@flowblade/source-duckdb` and `@flowblade/source-kysely`), usable with `instanceof` and as types. They carry a suggested http `statusCode` (404 and 500), recognized by http error helpers such as `isErrorWithErrorStatusCode()` from `@httpx/exception`.
  
  #### Notes
  
  - The SQL is never rewritten (no `LIMIT` added, unsupported by SQL Server), so checking the row count costs nothing on the happy path. All rows are fetched though: when the query isn't constrained by a unique key, bound it to 2 rows.
  - Row counts other than one are logged with LogTape: more than one row as a warning, no row at debug level (often an expected outcome).

## 0.6.1

### Patch Changes

- [#1438](https://github.com/belgattitude/flowblade/pull/1438) [`b1d4d53`](https://github.com/belgattitude/flowblade/commit/b1d4d53abb4c25fbde06c012005c4c09bc434817) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild with latest dx, no code change

## 0.6.0

### Minor Changes

- [#1433](https://github.com/belgattitude/flowblade/pull/1433) [`8e2dee7`](https://github.com/belgattitude/flowblade/commit/8e2dee7b71b6bdbf8368a8099abf7c0b36bd0b24) Thanks [@belgattitude](https://github.com/belgattitude)! - Add an optional error `cause` to `QError` and an optional abort `signal` to `QueryOptions`.
  
  - `QError.cause` holds the original error (ie: the driver error) so driver specific details, like error codes, can be inspected.
  - `QResult.getOrThrow()` now throws with the `QError` cause as error `cause`.
  - `QResult.map()` errors now keep the thrown value as `cause`.
  - `QResult.toJsonifiable()` leaves the `cause` out, so driver internals aren't sent to clients.
  - `QueryOptions.signal` (and so `QueryStreamOptions.signal`) lets datasources abort a query, support depends on the datasource.

## 0.5.2

### Patch Changes

- [#1430](https://github.com/belgattitude/flowblade/pull/1430) [`73463f0`](https://github.com/belgattitude/flowblade/commit/73463f0740a839db2c7a1e9d80fe6e6737544d89) Thanks [@belgattitude](https://github.com/belgattitude)! - Clearer `QResult.map()` error when a success result has no array of rows to map.
  
  - The error message is now `"QResult.map(): expected data to be an array of rows, received <undefined|null|type>"` (was `"mapper: no rows to map"`).
  - `null` (or any non-array) data now also returns this error instead of a raw `TypeError` (`Cannot read properties of null`).
  - Empty results (`[]`) are not affected and still map to `[]`.

## 0.5.1

### Patch Changes

- [#1423](https://github.com/belgattitude/flowblade/pull/1423) [`ccef41f`](https://github.com/belgattitude/flowblade/commit/ccef41f2d7ecdef56f06cb9c025804f09c946b4d) Thanks [@belgattitude](https://github.com/belgattitude)! - Replace internal `typescript-result` dependency with `better-result@3.0.1` (no public API change).

- [#1426](https://github.com/belgattitude/flowblade/pull/1426) [`f6feeff`](https://github.com/belgattitude/flowblade/commit/f6feeff1fb3cbb4db2cce8a9b6c1b03e74466984) Thanks [@belgattitude](https://github.com/belgattitude)! - Apply the new shared lint rules (no non-null assertions, no explicit any, exhaustive switches, unused vars...).
  
  - `QResult.map` on a success result whose `data` is `undefined` now returns the error `"mapper: no rows to map"` (was a raw `TypeError` message). Empty results (`[]`) are not affected and still map to `[]`.
  - `queryOrThrow` in `source-duckdb` and `source-kysely` now relies on `QResult.getOrThrow`, error message is unchanged.
  - `sqlduck`: `rowsToColumnsChunks` iterates keys with `for...of`, measured ~7% faster on wide (26 columns) rows.

## 0.5.0

### Minor Changes

- [#1350](https://github.com/belgattitude/flowblade/pull/1350) [`73ba5db`](https://github.com/belgattitude/flowblade/commit/73ba5dbac9b72d7700ceb14889b83513da7ba615) Thanks [@belgattitude](https://github.com/belgattitude)! - Improve `QMeta` spans
  
  - add the `materialization` span (`QMetaMaterializationSpan`) to the known spans (`QMetaKnownSpan`)
  - `getSpansByType()` now narrows the returned span from the requested type: `sql`, `map` and `materialization` return their dedicated shape, any other type returns a `QMetaCustomSpan` exposing `affectedRows`. New helper type `QMetaSpanOfType`
  - add `prependSpan()` to insert a span before the existing ones
  - spans are now stored as frozen shallow copies: the span given by the caller is neither kept nor frozen, and a stored span (and the `params` of a sql span) can't be modified
  - `withSpan()` no longer deep clones with `structuredClone` but shares the (frozen) spans, spans holding functions or class instances are now supported (fixes `QResult.map()` throwing on such spans)
  - `QMetaSqlSpan.params` is now typed as `readonly unknown[]`

## 0.4.3

### Patch Changes

- [#1411](https://github.com/belgattitude/flowblade/pull/1411) [`489125f`](https://github.com/belgattitude/flowblade/commit/489125fd0bf82e9869082f281675d43057327a26) Thanks [@belgattitude](https://github.com/belgattitude)! - Relint code for best practices

## 0.4.2

### Patch Changes

- [#1395](https://github.com/belgattitude/flowblade/pull/1395) [`b4c728a`](https://github.com/belgattitude/flowblade/commit/b4c728ab8dccac395700a60da494957228817258) Thanks [@belgattitude](https://github.com/belgattitude)! - Logtape to latest

## 0.4.1

### Patch Changes

- [#1390](https://github.com/belgattitude/flowblade/pull/1390) [`d92d2a6`](https://github.com/belgattitude/flowblade/commit/d92d2a6b94028ef2571d9ef7b42055f1db8d5089) Thanks [@belgattitude](https://github.com/belgattitude)! - Logtape to latest 2.3.9

## 0.4.0

### Minor Changes

- [#1385](https://github.com/belgattitude/flowblade/pull/1385) [`55b813c`](https://github.com/belgattitude/flowblade/commit/55b813c92b8b92aa85f66663808b355ef70fff48) Thanks [@belgattitude](https://github.com/belgattitude)! - Move to esm only

## 0.3.2

### Patch Changes

- [#1372](https://github.com/belgattitude/flowblade/pull/1372) [`512e273`](https://github.com/belgattitude/flowblade/commit/512e273a11a0608438fdc29a85bc0578f9e37656) Thanks [@belgattitude](https://github.com/belgattitude)! - Minimum version of logtape to include upstream security fixes

## 0.3.1

### Patch Changes

- [#1353](https://github.com/belgattitude/flowblade/pull/1353) [`3f74e46`](https://github.com/belgattitude/flowblade/commit/3f74e46d5006a191ca5c9cf7209136cc8d8b086f) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild using newly pnpm setup

## 0.3.0

### Minor Changes

- [#1348](https://github.com/belgattitude/flowblade/pull/1348) [`6740eb1`](https://github.com/belgattitude/flowblade/commit/6740eb102f70af458229237f300fc753058c6c84) Thanks [@belgattitude](https://github.com/belgattitude)! - Logtape to latest

## 0.2.30

### Patch Changes

- [#1346](https://github.com/belgattitude/flowblade/pull/1346) [`0508230`](https://github.com/belgattitude/flowblade/commit/050823071af28214b351f393d3f270bacc9acf1c) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild with latest tsdown, modernize monorepo

## 0.2.29

### Patch Changes

- [#1132](https://github.com/belgattitude/flowblade/pull/1132) [`8900220`](https://github.com/belgattitude/flowblade/commit/8900220af07074476d8bad7534eee2cb3918872d) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild using tsdown 0.22

## 0.2.28

### Patch Changes

- [#1054](https://github.com/belgattitude/flowblade/pull/1054) [`8ff8837`](https://github.com/belgattitude/flowblade/commit/8ff8837c2e344c2c413e5a33f227e0da7c3f5633) Thanks [@belgattitude](https://github.com/belgattitude)! - Refactor DatasourceStreamOptions into QueryStreamOptions with name support

## 0.2.27

### Patch Changes

- [#1052](https://github.com/belgattitude/flowblade/pull/1052) [`094de6f`](https://github.com/belgattitude/flowblade/commit/094de6fc7ad40821ed347e2424b7415ed75aab5b) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild using latest tsdown

## 0.2.26

### Patch Changes

- [#1018](https://github.com/belgattitude/flowblade/pull/1018) [`5889baa`](https://github.com/belgattitude/flowblade/commit/5889baa123a53dfd2a917ab4d70040726c32418b) Thanks [@belgattitude](https://github.com/belgattitude)! - Build with latest tsdown 0.21.1

## 0.2.25

### Patch Changes

- [#971](https://github.com/belgattitude/flowblade/pull/971) [`fba8cf0`](https://github.com/belgattitude/flowblade/commit/fba8cf0d13ffb1225cad6895a39447d5255befc7) Thanks [@belgattitude](https://github.com/belgattitude)! - Add convenience method queryOrThrow

## 0.2.24

### Patch Changes

- [#964](https://github.com/belgattitude/flowblade/pull/964) [`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8) Thanks [@belgattitude](https://github.com/belgattitude)! - Replace tsup by tsdown to build packages

- [#964](https://github.com/belgattitude/flowblade/pull/964) [`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8) Thanks [@belgattitude](https://github.com/belgattitude)! - Add bun support tests (unit & e2e)

## 0.2.23

### Patch Changes

- [#957](https://github.com/belgattitude/flowblade/pull/957) [`1d5aa8e`](https://github.com/belgattitude/flowblade/commit/1d5aa8e3514c78ab8018089001f33eabcece9fda) Thanks [@belgattitude](https://github.com/belgattitude)! - QResult properly return a Failure when the transformation function throws

- [#957](https://github.com/belgattitude/flowblade/pull/957) [`1d5aa8e`](https://github.com/belgattitude/flowblade/commit/1d5aa8e3514c78ab8018089001f33eabcece9fda) Thanks [@belgattitude](https://github.com/belgattitude)! - Use Date.now() rather than performance.now() for internal spans

- [#957](https://github.com/belgattitude/flowblade/pull/957) [`1d5aa8e`](https://github.com/belgattitude/flowblade/commit/1d5aa8e3514c78ab8018089001f33eabcece9fda) Thanks [@belgattitude](https://github.com/belgattitude)! - QResult make meta optional

- [#957](https://github.com/belgattitude/flowblade/pull/957) [`1d5aa8e`](https://github.com/belgattitude/flowblade/commit/1d5aa8e3514c78ab8018089001f33eabcece9fda) Thanks [@belgattitude](https://github.com/belgattitude)! - Mark internal typescript-result as js private

- [#957](https://github.com/belgattitude/flowblade/pull/957) [`1d5aa8e`](https://github.com/belgattitude/flowblade/commit/1d5aa8e3514c78ab8018089001f33eabcece9fda) Thanks [@belgattitude](https://github.com/belgattitude)! - Add QResult.getOrThrow() helper method

## 0.2.22

### Patch Changes

- [#951](https://github.com/belgattitude/flowblade/pull/951) [`b3df6f8`](https://github.com/belgattitude/flowblade/commit/b3df6f8f3cbc7b5bbc83f075b8ab90c51acfee24) Thanks [@belgattitude](https://github.com/belgattitude)! - Add stream options

## 0.2.21

### Patch Changes

- [#922](https://github.com/belgattitude/flowblade/pull/922) [`3e2633f`](https://github.com/belgattitude/flowblade/commit/3e2633fd49b53af2b0a5c446b741d61dbc7a224b) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild with esbuild 0.27.1

- [#924](https://github.com/belgattitude/flowblade/pull/924) [`15bdbd4`](https://github.com/belgattitude/flowblade/commit/15bdbd42bd8d904b13e8eb7629139a409cf56026) Thanks [@belgattitude](https://github.com/belgattitude)! - Update internal @httpx packages

## 0.2.20

### Patch Changes

- [`d878ad8`](https://github.com/belgattitude/flowblade/commit/d878ad8579dae8ff202377df99693b139e5c2fee) Thanks [@belgattitude](https://github.com/belgattitude)! - Use latest typescript-result

  Re-release https://github.com/belgattitude/flowblade/pull/915

## 0.2.19

### Patch Changes

- [#915](https://github.com/belgattitude/flowblade/pull/915) [`22f1611`](https://github.com/belgattitude/flowblade/commit/22f1611702d8cd8cba2549cfb1d41e8ebaafbedf) Thanks [@belgattitude](https://github.com/belgattitude)! - Support for latest typescript-result

## 0.2.18

### Patch Changes

- [#870](https://github.com/belgattitude/flowblade/pull/870) [`3cff1d0`](https://github.com/belgattitude/flowblade/commit/3cff1d0c37fde777341a12b596c4ccafb05bae4e) Thanks [@belgattitude](https://github.com/belgattitude)! - No code change, republish from CI

## 0.2.17

### Patch Changes

- [#840](https://github.com/belgattitude/flowblade/pull/840) [`55160db`](https://github.com/belgattitude/flowblade/commit/55160db8ae25f01829e8b4a3a80ee8d5183113dd) Thanks [@belgattitude](https://github.com/belgattitude)! - Update type-fest dependency

## 0.2.16

### Patch Changes

- [#685](https://github.com/belgattitude/flowblade/pull/685) [`4e9c0df`](https://github.com/belgattitude/flowblade/commit/4e9c0dfedd695d6a27df99f17318029bf298a7cb) Thanks [@belgattitude](https://github.com/belgattitude)! - Temporary lock typescript-result to 3.3.0

## 0.2.15

### Patch Changes

- [#683](https://github.com/belgattitude/flowblade/pull/683) [`5f4b2a9`](https://github.com/belgattitude/flowblade/commit/5f4b2a9cda5521bd03d569d0cf6af7c015baa92e) Thanks [@belgattitude](https://github.com/belgattitude)! - Update internal typescript result to 3.3.0

## 0.2.14

### Patch Changes

- [#678](https://github.com/belgattitude/flowblade/pull/678) [`8a77da6`](https://github.com/belgattitude/flowblade/commit/8a77da6a2e12880e5655c3efdd7185822c99589a) Thanks [@belgattitude](https://github.com/belgattitude)! - Drop node 18.x, requires node 20.9.0 or higher and add node 24.x to the CI.

## 0.2.13

### Patch Changes

- [#669](https://github.com/belgattitude/flowblade/pull/669) [`d1daef2`](https://github.com/belgattitude/flowblade/commit/d1daef252b3761d6ad39ea4cc5e4313e2e73e393) Thanks [@belgattitude](https://github.com/belgattitude)! - Export missing QResultJsonifiable type

## 0.2.12

### Patch Changes

- [#667](https://github.com/belgattitude/flowblade/pull/667) [`d568d76`](https://github.com/belgattitude/flowblade/commit/d568d76e104ad656c96638228089a036aaf9b7a8) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix QResult.map inference

## 0.2.11

### Patch Changes

- [#658](https://github.com/belgattitude/flowblade/pull/658) [`fb12c6e`](https://github.com/belgattitude/flowblade/commit/fb12c6ef77f87df6aea105018ecd19d1e77e52fc) Thanks [@belgattitude](https://github.com/belgattitude)! - Doc fixes

## 0.2.10

### Patch Changes

- [#652](https://github.com/belgattitude/flowblade/pull/652) [`092d4a0`](https://github.com/belgattitude/flowblade/commit/092d4a055202723520ad49c507b2b66fac7739e3) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild with tsup 8.5.0

## 0.2.9

### Patch Changes

- [#643](https://github.com/belgattitude/flowblade/pull/643) [`8733fad`](https://github.com/belgattitude/flowblade/commit/8733fada4a93582e499f5533755a033af2bc49f7) Thanks [@belgattitude](https://github.com/belgattitude)! - Rebuild with latest esbuild 0.25.4

## 0.2.8

### Patch Changes

- [#337](https://github.com/belgattitude/flowblade/pull/337) [`a4c0261`](https://github.com/belgattitude/flowblade/commit/a4c02616b082b244fc095ff97086a40f15545019) Thanks [@belgattitude](https://github.com/belgattitude)! - Update browserslist baseline

## 0.2.7

### Patch Changes

- [#328](https://github.com/belgattitude/flowblade/pull/328) [`485d95e`](https://github.com/belgattitude/flowblade/commit/485d95ee70b6af2a9ce32ee42420cd1cf8fbdd19) Thanks [@belgattitude](https://github.com/belgattitude)! - Update browserslist minimums

  ```
  defaults
  chrome >= 96
  firefox >= 94
  edge >= 91
  safari >= 15
  ios >= 15
  opera >= 83
  ```

## 0.2.6

### Patch Changes

- [#315](https://github.com/belgattitude/flowblade/pull/315) [`1a5cf14`](https://github.com/belgattitude/flowblade/commit/1a5cf14e3db80e086301cf588c5c49a3076ec8af) Thanks [@belgattitude](https://github.com/belgattitude)! - Add InferQResult

- [#315](https://github.com/belgattitude/flowblade/pull/315) [`1a5cf14`](https://github.com/belgattitude/flowblade/commit/1a5cf14e3db80e086301cf588c5c49a3076ec8af) Thanks [@belgattitude](https://github.com/belgattitude)! - Export AdyncQResult convenience type

## 0.2.5

### Patch Changes

- [#277](https://github.com/belgattitude/flowblade/pull/277) [`0bcf17a`](https://github.com/belgattitude/flowblade/commit/0bcf17a9eff68ad6b6eebbbb6a36354ed3f5abe4) Thanks [@belgattitude](https://github.com/belgattitude)! - Perf types, avoid union when infering TData

## 0.2.4

### Patch Changes

- [#272](https://github.com/belgattitude/flowblade/pull/272) [`93f3cb0`](https://github.com/belgattitude/flowblade/commit/93f3cb07c44a37ce608720bd7dd28200a1e2d790) Thanks [@belgattitude](https://github.com/belgattitude)! - Added $inferValue and $inferError utilities

## 0.2.3

### Patch Changes

- [#270](https://github.com/belgattitude/flowblade/pull/270) [`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79) Thanks [@belgattitude](https://github.com/belgattitude)! - Patch version but a lot of BC for datasource components

## 0.2.2

### Patch Changes

- [#250](https://github.com/belgattitude/flowblade/pull/250) [`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix last release

## 0.2.1

### Patch Changes

- [#244](https://github.com/belgattitude/flowblade/pull/244) [`1f9ad6c`](https://github.com/belgattitude/flowblade/commit/1f9ad6cb5ba87a4299066a41af383e74865c6a3b) Thanks [@belgattitude](https://github.com/belgattitude)! - Initial version for @flowblade/core

- [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb) - Republish
