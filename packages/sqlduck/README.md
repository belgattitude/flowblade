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
import { SqlDuck, DuckDatabaseManager } from "@flowblade/sqlduck";
import * as z from "zod";
import { conn } from "./db.config.ts";

const dbManager = new DuckDatabaseManager(conn);
const database = await dbManager.attach({
  type: "memory", // can be 'filesystem', ...
  alias: "mydb",
  options: { COMPRESS: "false" },
});

const sqlDuck = new SqlDuck({ conn });

// Define a zod schema, it will be used to create the table
const userSchema = z.object({
  id: z.int32().min(1).meta({ primaryKey: true }),
  name: z.string(),
});

// Example of a datasource (can be generator, async generator, async iterable)
async function* getUsers(): AsyncIterableIterator<z.infer<typeof userSchema>> {
  // database or api call
  yield { id: 1, name: "John" };
  yield { id: 2, name: "Jane" };
}

// Create a table from the schema and the datasource
const result = await sqlDuck.toTable({
  table: new Table({ name: "user", database: database.alias }),
  schema: userSchema, // The schema to use to create the table
  rowStream: getUsers(), // The async iterable that yields rows
  // 👇Optional:
  chunkSize: 2048, // Number of rows to append when using duckdb appender. Default is 2048
  onChunkAppended: ({ timeMs, totalRows, rowsPerSecond }) => {
    console.log(
      `Appended ${totalRows} in time ${timeMs}ms, est: ${rowsPerSecond} rows/s`
    );
  },
  // Optional table creation options
  createOptions: {
    create: "CREATE_OR_REPLACE",
  },
});

console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
console.log(`Table created with DDL: ${result.createTableDDL}`);

const reader = await conn.runAndReadAll("select * from mydb.user");
const rows = reader.getRowObjectsJS();
// [{id: 1, name: 'John'}, {id: 2, name: 'Jane'}]]
```

### Create a memory table

```typescript
import { SqlDuck } from "@flowblade/sqlduck";
import * as z from "zod";
import { dbDuckDbMemoryConn } from "./db.duckdb-memory.config";

const sqlDuck = new SqlDuck({ conn: duckDbConnection });

// Schema of the table, not that you can use meta to add information
const userSchema = z.object({
  id: z.number().int().meta({ primaryKey: true }),
  name: z.string(),
});

// Async generator function that yields rows to insert
async function* getUserRows(): AsyncIterableIterator<
  z.infer<typeof userSchema>
> {
  // database or api call
}

const result = sqlDuck.toTable({
  table: new Table({ name: "user", database: "mydb" }), // Table definition
  schema: userSchema, // The schema to use to create the table
  rowStream: getUserRows(), // The async iterable that yields rows
  // 👇Optional:
  chunkSize: 2048, // Number of rows to append when using duckdb appender. Default is 2048
  onChunkAppended: ({ totalRows }) => {
    console.log(`Appended ${totalRows} rows so far`);
  },
  // Optional table creation options
  createOptions: {
    create: "CREATE_OR_REPLACE",
  },
});

console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
console.log(`Table created with DDL: ${result.createTableDDL}`);

// You can now use the table in your queries
const queryResult = await dbDuckDbMemoryConn.query<{
  id: number;
  name: string;
}>(`
  SELECT id, name FROM mydb.user WHERE id < 1000
`);
```

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
