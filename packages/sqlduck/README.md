## @flowblade/sqlduck

> Currently experimental


- 🛡️ DuckDB table creation from Zod schemas.
- 🧩 Easily ingest data from generators or async iterables.


## Quick start

### Create a database connection

```typescript
import { DuckDBInstance } from '@duckdb/node-api';
DuckDBInstance.create(undefined, {
   access_mode: 'READ_WRITE',
   max_memory: '512M',
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
    type: ':memory:', // can be 'duckdb', ...
    alias: 'mydb',
    options: { COMPRESS: 'false' },
});

const sqlDuck = new SqlDuck({ conn });

// Define a zod schema, it will be used to create the table
const userSchema = z.object({
    id: z.int32().min(1).meta({ primaryKey: true }),
    name: z.string(),
});

// Example of a datasource (can be generator, async generator, async iterable)
async function* getUsers(): AsyncIterableIterator<
    z.infer<typeof userSchema>
> {
    // database or api call
    yield { id: 1, name: 'John' };
    yield { id: 2, name: 'Jane' };
}

// Create a table from the schema and the datasource
const result = await sqlDuck.toTable({
    table: new Table({ name: 'user', database: database.alias }),
    schema: userSchema, // The schema to use to create the table
    rowStream: getUsers(), // The async iterable that yields rows
    // 👇Optional:
    chunkSize: 2048, // Number of rows to append when using duckdb appender. Default is 2048
    onDataAppended: ({ timeMs, totalRows, rowsPerSecond }) => {
        console.log(
            `Appended ${totalRows} in time ${timeMs}ms, est: ${rowsPerSecond} rows/s`
        );
    },
    // Optional table creation options
    createOptions: {
        create: 'CREATE_OR_REPLACE',
    },
});

console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
console.log(`Table created with DDL: ${result.createTableDDL}`);

const reader = await conn.runAndReadAll('select * from mydb.user');
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
  onDataAppended: ({ total }) => {
    console.log(`Appended ${total} rows so far`);
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

### Node 24

```
 RUN  v4.1.1 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 4157ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  2.6950  357.08  385.05  371.06  385.05  385.05  385.05  385.05  ±47.90%        2
   · duckdb appender file, count: 100000, chunk size 2048    1.4218  703.35  703.35  703.35  703.35  703.35  703.35  703.35   ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024         2.5157  391.12  403.89  397.50  403.89  403.89  403.89  403.89  ±20.41%        2

 ✓ bench/stream.bench.ts > Bench stream 2809ms
     name                                                       hz      min     max    mean     p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)  9.2627  87.7271  151.56  107.96  116.92  151.56  151.56  151.56  ±15.98%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)   7.1479   125.04  168.13  139.90  152.97  168.13  168.13  168.13   ±7.78%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 614ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  18,899.24  0.0334  5.3351  0.0529  0.0546  0.1943  0.3087  0.7214  ±2.72%     9450

 BENCH  Summary

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.07x faster than duckdb appender, count: 100000, chunk size 1024
    1.90x faster than duckdb appender file, count: 100000, chunk size 2048

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench stream
    1.30x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod
```

### Bun 1.3.11

```
 RUN  v4.1.1 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 4159ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  2.6465  375.34  380.38  377.86  380.38  380.38  380.38  380.38   ±8.48%        2
   · duckdb appender file, count: 100000, chunk size 2048    1.5016  665.98  665.98  665.98  665.98  665.98  665.98  665.98   ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024         2.2828  413.11  463.01  438.06  463.01  463.01  463.01  463.01  ±72.39%        2

 ✓ bench/stream.bench.ts > Bench stream 2690ms
     name                                                       hz      min     max    mean     p75     p99    p995    p999     rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)  9.5675  95.6610  114.11  104.52  107.75  114.11  114.11  114.11  ±3.46%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)   7.6895   117.83  138.26  130.05  137.51  138.26  138.26  138.26  ±4.05%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 629ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  18,892.06  0.0281  7.5844  0.0529  0.0516  0.1893  0.2477  3.2823  ±6.26%     9447

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench stream
    1.24x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.16x faster than duckdb appender, count: 100000, chunk size 1024
    1.76x faster than duckdb appender file, count: 100000, chunk size 2048

```

### Local scripts

| Name              | Description                    |
| ----------------- | ------------------------------ |
| `yarn build`      |                                |
| `yarn typecheck`  |                                |
| `yarn lint`       | Check for lint errors          |
| `yarn lint --fix` | Attempt to run linter auto-fix |
| `yarn test-unit`  | Run unit tests                 |
| `yarn test-e2e`   | Run unit tests                 |
