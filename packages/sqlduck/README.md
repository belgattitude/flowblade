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
    type: 'memory', // can be 'filesystem', ...
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
    onChunkAppended: ({ timeMs, totalRows, rowsPerSecond }) => {
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

### Node 24.15

```
 RUN  v4.1.5 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 3477ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  2.9578  336.81  339.37  338.09  339.37  339.37  339.37  339.37   ±4.82%        2
   · duckdb appender file, count: 100000, chunk size 2048    1.5359  651.07  651.07  651.07  651.07  651.07  651.07  651.07   ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024         2.8450  328.25  374.74  351.50  374.74  374.74  374.74  374.74  ±84.06%        2

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 3514ms
     name                                                                         hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   10.6932  76.7549  197.03  93.5173  88.9991  197.03  197.03  197.03  ±28.09%       10
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  10.2660  87.8295  141.15  97.4092  97.0299  141.15  141.15  141.15  ±11.56%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                     8.3811   113.83  136.27   119.32   118.84  136.27  136.27  136.27   ±4.30%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 614ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  20,399.65  0.0328  1.2897  0.0490  0.0425  0.1957  0.2681  0.6023  ±1.77%    10201

 BENCH  Summary

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.04x faster than duckdb appender, count: 100000, chunk size 1024
    1.93x faster than duckdb appender file, count: 100000, chunk size 2048

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.04x faster than rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)
    1.28x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

```

### Bun 1.3.13

```
 RUN  v4.1.5 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 3382ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  3.0570  310.57  343.67  327.12  343.67  343.67  343.67  343.67  ±64.30%        2
   · duckdb appender file, count: 100000, chunk size 2048    2.6163  377.75  386.70  382.22  386.70  386.70  386.70  386.70  ±14.88%        2
   · duckdb appender, count: 100000, chunk size 1024         3.0427  319.38  337.93  328.65  337.93  337.93  337.93  337.93  ±35.86%        2

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 3075ms
     name                                                                         hz      min      max     mean      p75      p99     p995     p999     rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   12.5039  68.9091  89.8222  79.9751  84.4430  89.8222  89.8222  89.8222  ±5.45%       10
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  10.9097  83.6090   124.66  91.6616  92.3154   124.66   124.66   124.66  ±9.42%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                    10.2729  90.7410   104.18  97.3436   100.41   104.18   104.18   104.18  ±2.93%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 629ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  20,285.23  0.0260  6.9886  0.0493  0.0466  0.1700  0.2249  2.6988  ±6.12%    10143

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.15x faster than rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)
    1.22x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.00x faster than duckdb appender, count: 100000, chunk size 1024
    1.17x faster than duckdb appender file, count: 100000, chunk size 2048
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
