## @flowblade/sqlduck

> Currently experimental

- 🛡️ DuckDB table creation from Zod schemas.
- 🧩 Easily ingest data from generators or async iterables.

## Quick start

### Create a database connection

```typescript
import { DuckDBInstance } from "@duckdb/node-api";
DuckDBInstance.create(undefined, {
  access_mode: "READ_WRITE",
  max_memory: "512M",
});
export const conn = await instance.connect();
```

### Append data to a database

```typescript
import { DuckDatabaseManager, Table } from "@flowblade/sqlduck";
import { DuckTableLoader } from "@flowblade/sqlduck/loader";
import * as z from "zod";

import { conn } from "./db.config.ts";

const dbManager = new DuckDatabaseManager(conn);
const database = await dbManager.attach({
  type: "memory", // can be 'filesystem', ...
  alias: "mydb",
  options: { COMPRESS: "false" },
});

// Define a zod schema, it will be used to create the table
const userSchema = z.object({
  id: z.int32().min(1).meta({ primaryKey: true }),
  name: z.string(),
});

// Example of a datasource (can be an array, generator, async iterable...)
async function* getUsers(): AsyncIterableIterator<z.input<typeof userSchema>> {
  // database or api call
  yield { id: 1, name: "John" };
  yield { id: 2, name: "Jane" };
}

const loader = new DuckTableLoader({ conn });

// Create a table from the schema and load the rows
const result = await loader.load({
  table: new Table({ name: "user", database: database.alias }),
  schema: userSchema, // The schema to use to create the table
  rows: getUsers(), // The rows to load
  // 👇Optional:
  mode: "createOrReplace", // Default is "create"
  progress: {
    intervalMs: 1000, // Default, or everyRows: 100_000
    onProgress: ({ intervalMs, totalRows, rowsPerSecond }) => {
      console.log(
        `Loaded ${totalRows} rows, est: ${rowsPerSecond} rows/s over ${intervalMs}ms`
      );
    },
  },
});

console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
console.log(`Table created with DDL: ${result.createTableDDL}`);

const reader = await conn.runAndReadAll("select * from mydb.user");
const rows = reader.getRowObjectsJS();
// [{id: 1, name: 'John'}, {id: 2, name: 'Jane'}]]
```

The loading strategy (DuckDB appender by default, row appender, prepared inserts with upserts), modes, checkpoints, progress and tuning are described in the [loader documentation](./docs/loader.md).

### Export a query to a temporary file

`QueryExporter` exports a parameterized SQL-tag query to a CSV, Parquet or Excel file. Options shared by every export (like the `directory`) are set once in the constructor. `export()` completes the file before returning an artifact, which can then be streamed to an HTTP response:

```typescript
import { pipeline } from "node:stream/promises";

import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { QueryExporter } from "@flowblade/sqlduck/export";

const exporter = new QueryExporter({
  datasource: new DuckdbDatasource({ connection: conn }),
  directory: "/var/tmp/exports", // optional, defaults to os.tmpdir()
});

const artifact = await exporter.export({
  sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
  format: { type: "csv", header: true },
});

try {
  response.setHeader("Content-Type", artifact.contentType);
  response.setHeader("Content-Disposition", artifact.contentDisposition);
  await pipeline(artifact.openStream(), response);
} finally {
  await artifact.dispose();
}
```

Provide an existing `directory` to choose where temporary files are created; the default is the operating system's temp directory. It can also be overridden per `export()` call. Always call `dispose()` when the response finishes, is cancelled or fails. CSV supports header, delimiter, quoting, null/date/timestamp formatting and gzip/zstd compression. Parquet supports compression, row-group size and order preservation. Excel exports as XLSX and supports header, sheet name and sheet row limit; DuckDB's Excel extension may need network access the first time.

#### Map the exported query

Both options run inside DuckDB, so rows never go through JavaScript:

- `mapQuery` rewrites the query, typically by wrapping it to filter, order or add computed columns.
- `selectColumns` picks, reorders and renames the exported columns. Keys are the query's column names (after `mapQuery`), values are their names in the export; unlisted columns are dropped.

```typescript
const artifact = await exporter.export({
  sql: sql`SELECT id, name, password FROM user`,
  format: { type: "csv", header: true },
  mapQuery: (query) =>
    sql`SELECT *, upper(name) AS name_uc FROM (${query}) ORDER BY id`,
  selectColumns: { id: "User ID", name_uc: "Name" },
});
```

### Query a materialized Kysely query

> ⚠️ **Experimental**: the API below may change in a minor release.

`withMaterializedKyselyQuery` streams the rows of a Kysely query (e.g. from mssql or postgres) into a temporary DuckDB table, runs your query on it, then drops the table, whether the query succeeds, fails or throws.

```typescript
import { DuckDBInstance } from "@duckdb/node-api";
import {
  createKyselyMssqlDialect,
  TediousConnUtils,
} from "@flowblade/source-kysely";
import { sql } from "@flowblade/sql-tag";
import {
  KyselyQueryWithZodSchema,
  withMaterializedKyselyQuery,
} from "@flowblade/sqlduck/kysely";
import { Kysely } from "kysely";
import * as z from "zod";

// Source database: any Kysely instance (here mssql)
type DB = {
  user: { id: number; name: string };
};
const db = new Kysely<DB>({
  dialect: createKyselyMssqlDialect({
    tediousConfig: TediousConnUtils.fromJdbcDsn(
      "sqlserver://localhost:1433;database=db;user=sa;password=pwd"
    ),
  }),
});

// Target duckdb connection (a DuckDBConnection or a DuckdbDatasource)
const instance = await DuckDBInstance.create();
const conn = await instance.connect();

const table = new KyselyQueryWithZodSchema({
  query: db.selectFrom("user").select(["id", "name"]),
  // used to create the temporary table, must match the selected columns
  schema: z.strictObject({ id: z.int32(), name: z.string() }),
});

const result = await withMaterializedKyselyQuery({
  duckConn: conn,
  table,
  // 👇Optional: where the temporary table is created.
  // Defaults to the connection's current database and schema.
  database: "scratch", // e.g. ATTACH 'scratch.duckdb' AS scratch
  schema: "staging", // must already exist
  query: ({ dsDuck, table }) =>
    dsDuck.query(
      sql<{ id: number; name: string }>`
                SELECT id, name FROM ${sql.raw(table.getFullName())} WHERE id < 1000
            `
    ),
});

if (result.error) {
  // materialization or query error
} else {
  console.log(result.data);
  // the first span holds the materialization info (ddl, affectedRows, timeMs, tableName)
  console.log(result.meta.getSpansByType("materialization"));
}
```

`database` and `schema` must be valid, non-reserved DuckDB identifiers, otherwise an error result is returned and the query is not run. Targeting an attached file database keeps large materializations out of the in-memory one.

### Transactions

sqlduck takes part in the `DuckdbDatasource` transactions of the same connection (see [@flowblade/source-duckdb](https://github.com/belgattitude/flowblade/tree/main/packages/source-duckdb#transactions)):

- a transaction waits for a running load (`toTable()`) or manager query, and they wait for a running transaction,
- in a transaction callback, they run in the transaction: a failed load prevents the commit.

```typescript
const ds = new DuckdbDatasource({ connection: conn });
await ds.transactionOrThrow(async (tx) => {
  await tx.queryOrThrow(sql`DELETE FROM product`);
  // rolled back with the delete if anything fails
  await sqlDuck.toTable({ table, schema, rowStream, autoCheckpoint: false });
});
```

> **Note**: DuckDB can't checkpoint in a transaction, the checkpoints of the loads run in a transaction callback are skipped (`autoCheckpoint`, `checkpointChunksFrequency`, the `checkpoint` options of `DuckTableLoader`). Use `isInConnectionTransaction(conn)` from `@flowblade/source-duckdb` to do the same in your code.

## Compatibility

| Level | CI | Description |
| --- | --- | --- |
| Node | ✅ | Requires 22.18+, CI for 22.x, 24.x & 26.x |
| Bun | ✅ | Bun 1.4+, unit tests run on CI with the latest Bun |
| Deno | ✅ | Deno LTS, unit tests run on CI with Deno 2 |
| DuckDB | ✅ | `@duckdb/node-api` 2.x (`^2.0.0-r.1`), 1.x is no longer supported |
| Typescript | ✅ | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI. |
| ES2022 | ✅ | Dist files checked with [es-check](https://github.com/yowainwright/es-check) |

## Benchmarks

### Node 24.21

```
 RUN  v5.0.1 /home/sebastien/github/flowblade/packages/sqlduck

 ✓  bench  bench/appender.bench.ts (1 test) 7533ms
   ✓ appender benches 7530ms
     name                                                             hz     min     max    mean     p75     p99    p995    p999      rme  samples
     duckdb appender, count: 100000, chunk size 1024              5.1751  180.11  231.60  194.56  192.86  229.70  230.65  231.41  ±10.12%        6   fastest
     duckdb appender memory, count: 100000, chunk size 2048       5.0295  172.58  244.98  202.55  226.73  244.25  244.62  244.91  ±19.34%        5
     duckdb appender file no wal, count: 100000, chunk size 1024  4.2547  210.67  317.28  240.39  237.64  314.09  315.69  316.96  ±22.80%        5
     duckdb appender file no wal, count: 100000, chunk size 2048  3.8371  200.49  323.42  268.76  295.48  322.31  322.87  323.31  ±30.51%        4
     duckdb appender file, count: 100000, chunk size 2048         3.7207  257.80  287.20  269.21  272.99  286.63  286.91  287.14   ±7.53%        4   slowest
 ✓  bench  bench/stream.bench.ts (1 test) 3986ms
   ✓ Bench rowsToColumnsChunks 3985ms
     name                                                                         hz      min      max     mean      p75      p99     p995     p999      rme  samples
     rowToColumnsChunk with chunkSize 2048 (count: 100000)                   16.4982  53.5190  78.3487  61.5746  70.6733  78.0419  78.1953  78.3180   ±7.00%       17   fastest
     rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  13.4073  63.2078   105.13  76.1133  81.6002   102.92   104.03   104.91   ±8.98%       14
     mapFakeRowStream with chunkSize 2048 (count: 100000)                    10.3533  82.5579   120.58  98.5407   113.23   120.25   120.42   120.54  ±10.12%       11   slowest
 ✓  bench  bench/table-create.bench.ts (1 test) 1286ms
   ✓ Bench getTableCreateFromZod 1284ms
     name                          hz     min      max    mean     p75     p99    p995    p999     rme  samples
     getTableCreateFromZod  20,993.53  0.0343  10.9287  0.0597  0.0619  0.2081  0.3518  0.6929  ±4.00%    16755
```

### Bun 1.4.2

```
 RUN  v5.0.1 /home/sebastien/github/flowblade/packages/sqlduck

 ✓  bench  bench/appender.bench.ts (1 test) 7353ms
   ✓ appender benches 7351ms
     name                                                             hz     min     max    mean     p75     p99    p995    p999      rme  samples
     duckdb appender memory, count: 100000, chunk size 2048       6.5010  141.93  167.82  154.19  158.35  167.29  167.55  167.77   ±4.92%        7   fastest
     duckdb appender, count: 100000, chunk size 1024              5.8972  158.33  185.98  170.04  174.01  185.43  185.70  185.92   ±6.09%        6
     duckdb appender file no wal, count: 100000, chunk size 2048  5.1876  181.29  250.19  195.34  189.16  247.18  248.69  249.89  ±14.55%        6
     duckdb appender file no wal, count: 100000, chunk size 1024  4.8410  187.20  264.48  209.80  208.05  262.22  263.35  264.26  ±18.63%        5
     duckdb appender file, count: 100000, chunk size 2048         4.1319  229.30  261.16  242.64  253.36  260.85  261.00  261.13   ±7.09%        5   slowest
 ✓  bench  bench/stream.bench.ts (1 test) 3933ms
   ✓ Bench rowsToColumnsChunks 3931ms
     name                                                                         hz      min      max     mean      p75      p99     p995     p999     rme  samples
     rowToColumnsChunk with chunkSize 2048 (count: 100000)                   24.5296  34.3957  51.2149  41.1676  43.4825  50.3109  50.7629  51.1245  ±4.18%       25   fastest
     rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  23.5864  36.3807  57.7801  42.8068  43.2094  56.3888  57.0845  57.6410  ±4.56%       24
     mapFakeRowStream with chunkSize 2048 (count: 100000)                    21.5954  42.7406  51.6524  46.4448  48.1176  51.5462  51.5993  51.6418  ±2.52%       22   slowest
 ✓  bench  bench/table-create.bench.ts (1 test) 1310ms
   ✓ Bench getTableCreateFromZod 1308ms
     name                          hz     min      max    mean     p75     p99    p995    p999     rme  samples
     getTableCreateFromZod  37,765.77  0.0185  10.1286  0.0360  0.0346  0.1235  0.1771  2.3683  ±4.27%    27781
```

### Local scripts

| Name              | Description                    |
| ----------------- | ------------------------------ |
| `pnpm build`      |                                |
| `pnpm typecheck`  |                                |
| `pnpm lint`       | Check for lint errors          |
| `pnpm lint --fix` | Attempt to run linter auto-fix |
| `pnpm test-unit`  | Run unit tests                 |
| `pnpm test-e2e`   | Run unit tests                 |
