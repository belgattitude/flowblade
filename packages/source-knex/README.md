# @flowblade/source-knex

[Knex](https://knexjs.org/) datasource for Flowblade: run your Knex queries and get a `QResult` (rows, error and metadata) instead of exceptions, stream rows, and run transactions with savepoints and retries. Same contracts as [`@flowblade/source-kysely`](https://github.com/belgattitude/flowblade/tree/main/packages/source-kysely#readme) and `@flowblade/source-duckdb`.

> **Status**: new package (0.x). Covered by unit tests on SQLite (`better-sqlite3`) and e2e tests on Postgres and SQL Server (testcontainers, `pnpm test-e2e`, needs Docker). MySQL is supported by design (the response shapes are normalized, see below) but not tested against a real database yet.

## Install

```bash
pnpm add @flowblade/source-knex knex
```

Install the driver of your database (`pg`, `mysql2`, `tedious`, `better-sqlite3`...). Streaming a Postgres query also requires `pg-query-stream`. Node.js 22.18 or newer.

## Quick start

```typescript
import { KnexDatasource } from "@flowblade/source-knex";
import knex from "knex";

const db = knex({ client: "pg", connection: process.env.DATABASE_URL });
const ds = new KnexDatasource({ connection: db });

const query = ds
  .queryBuilder("brand as b")
  .select("b.id", "b.name")
  .where("b.created_at", "<", new Date())
  .orderBy("b.name", "desc");

const { data, error, meta } = await ds.query(query, { name: "getBrands" });

if (error) {
  // error: QError (message, code "QUERY_FAILED" | "ABORTED", cause)
  console.error(error.message, error.cause);
  return;
}
console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
```

| Method | Description |
| --- | --- |
| `query()` | Returns a `QResult`, never throws |
| `queryOrThrow()` | Returns `{ data, meta }`, throws on error |
| `queryOne()` / `queryOneOrThrow()` | At most one row / exactly one row |
| `stream()` | Async iterator of rows |
| `transaction()` / `transactionOrThrow()` | Transaction with `rollback()`, `savepoint()`, `retry` |

`query()` accepts a Knex query builder or `knex.raw()`.

## Results

Knex resolves differently by method and dialect. `KnexDatasource` normalizes it:

| Query | `data` | `meta` |
| --- | --- | --- |
| `select`, `returning` | the rows |  |
| `first()` | `[row]`, or `[]` without match |  |
| `insert` (mysql, sqlite) | the inserted ids, as returned by Knex |  |
| `update`, `del` | `[]` | `affectedRows` of the sql span |
| `raw()` | the rows (pg `rows`, mysql `[rows]`, mssql / sqlite arrays) or `[]` | `affectedRows` for the writes (not on SQL Server: knex doesn't return it, use a builder) |

## Transactions

```typescript
const { data, error } = await ds.transaction(
  async (tx) => {
    await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "Acme" }));

    // rolled back to the savepoint, the transaction continues
    await tx.savepoint(async (sp) => {
      await sp.queryOrThrow(sp.queryBuilder("brand").insert({ name: "Tmp" }));
      sp.rollback("not needed");
    });
    return "done";
  },
  { isolationLevel: "serializable", retry: { maxRetries: 3 } }
);
```

- Committed when the callback resolves; rolled back when it throws, when `tx.rollback()` is called, or when a query fails.
- A query built with the parent `ds.queryBuilder` but run with `tx.query()` runs in the transaction.
- Conflicts (Postgres `40001` / `40P01`, SQL Server 1205 / 3960, MySQL 1213) are reported as `TRANSACTION_CONFLICT` and retried with `retry`.
- Nested transactions aren't supported, use savepoints (a nested Knex transaction).

## Limitations

- **No query cancellation**: Knex can't cancel a running query. When a `signal` aborts, the result is an `ABORTED` error, but the query keeps running on the database and its connection is released when it settles. In a transaction, the commit or rollback waits for such a query to end first (SQL Server can't run a request on a busy connection), so rolling back an aborted transaction takes as long as its running query.
- **`stream()`**: `chunkSize` is passed as the stream `highWaterMark`. The connection is released when the loop ends, is left early or aborted.
- Typing: rows follow the Knex typing of the query (`knex<Brand>("brand")`). A `raw()` query is typed `unknown[]`, pass the row type as the second generic of `query()`.
- Logs use [LogTape](https://logtape.org/) (category `["flowblade", "knex"]`), set `logParams: false` to keep the params out of the logs.

## License

MIT
