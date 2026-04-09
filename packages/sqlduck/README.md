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
 RUN  v4.1.4 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 3412ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999       rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  2.8872  295.84  396.87  346.35  396.87  396.87  396.87  396.87  ±185.36%        2
   · duckdb appender file, count: 100000, chunk size 2048    1.7908  558.40  558.40  558.40  558.40  558.40  558.40  558.40    ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024         1.9967  500.82  500.82  500.82  500.82  500.82  500.82  500.82    ±0.00%        1

 ✓ bench/stream.bench.ts > Bench stream 2140ms
     name                                                        hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)  11.8099  63.0430  172.82  84.6748  81.4757  172.82  172.82  172.82  ±27.12%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)   10.0442  79.5805  125.81  99.5603   112.35  125.81  125.81  125.81  ±12.04%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 617ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  27,583.03  0.0226  2.7818  0.0363  0.0403  0.1185  0.1583  0.4321  ±1.66%    13792

 BENCH  Summary

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.45x faster than duckdb appender, count: 100000, chunk size 1024
    1.61x faster than duckdb appender file, count: 100000, chunk size 2048

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench stream
    1.18x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod
```

### Bun 1.3.11

```
 RUN  v4.1.4 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 3357ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  2.9741  315.71  356.77  336.24  356.77  356.77  356.77  356.77  ±77.59%        2
   · duckdb appender file, count: 100000, chunk size 2048    1.8953  527.62  527.62  527.62  527.62  527.62  527.62  527.62   ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024         1.7803  561.70  561.70  561.70  561.70  561.70  561.70  561.70   ±0.00%        1

 ✓ bench/stream.bench.ts > Bench stream 2058ms
     name                                                        hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)  12.0130  60.7081  111.32  83.2432  99.7116  111.32  111.32  111.32  ±14.15%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)   10.9710  76.4253  145.14  91.1493  91.1424  145.14  145.14  145.14  ±16.04%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 621ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  27,472.91  0.0185  4.6226  0.0364  0.0369  0.1137  0.1476  1.9138  ±5.20%    13737

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench stream
    1.09x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

  duckdb appender memory, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.57x faster than duckdb appender file, count: 100000, chunk size 2048
    1.67x faster than duckdb appender, count: 100000, chunk size 1024

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
