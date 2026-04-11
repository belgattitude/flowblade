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

### Node 24

```

 RUN  v4.1.4 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 2910ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999       rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  3.5446  265.91  298.32  282.12  298.32  298.32  298.32  298.32   ±72.99%        2
   · duckdb appender file, count: 100000, chunk size 2048    2.6130  355.30  410.10  382.70  410.10  410.10  410.10  410.10   ±91.00%        2
   · duckdb appender, count: 100000, chunk size 1024         3.8027  226.52  299.42  262.97  299.42  299.42  299.42  299.42  ±176.17%        2

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 2998ms
     name                                                                         hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   11.3182  60.6404  190.56  88.3532  79.4999  190.56  190.56  190.56  ±30.64%       10
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  13.4430  63.9716  102.73  74.3883  75.2151  102.73  102.73  102.73  ±10.40%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                    10.7785  84.3040  117.57  92.7773  97.1595  117.57  117.57  117.57   ±7.61%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 615ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  27,048.71  0.0239  3.2029  0.0370  0.0404  0.1310  0.1980  0.5674  ±2.08%    13525

 BENCH  Summary

  duckdb appender, count: 100000, chunk size 1024 - bench/appender.bench.ts > appender benches
    1.07x faster than duckdb appender memory, count: 100000, chunk size 2048
    1.46x faster than duckdb appender file, count: 100000, chunk size 2048

  rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.19x faster than rowToColumnsChunk with chunkSize 2048 (count: 100000)
    1.25x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod
```

### Bun 1.3.12

```
 RUN  v4.1.4 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 2811ms
     name                                                        hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048  3.9242  224.75  285.38  254.83  285.38  285.38  285.38  285.38  ±29.56%        3
   · duckdb appender file, count: 100000, chunk size 2048    3.8209  256.09  267.34  261.72  267.34  267.34  267.34  267.34  ±27.31%        2
   · duckdb appender, count: 100000, chunk size 1024         4.6118  196.77  234.22  216.84  234.22  234.22  234.22  234.22  ±21.62%        3

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 2667ms
     name                                                                         hz      min      max     mean      p75      p99     p995     p999     rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   14.4994  57.7717  81.8690  68.9683  78.5234  81.8690  81.8690  81.8690  ±9.43%       10
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  13.2052  68.7139  96.8400  75.7275  79.4380  96.8400  96.8400  96.8400  ±8.22%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                    12.7827  73.9127  85.0696  78.2310  82.5510  85.0696  85.0696  85.0696  ±3.69%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 624ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  28,477.04  0.0191  6.4836  0.0351  0.0335  0.1071  0.1530  2.4823  ±6.21%    14239

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.10x faster than rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)
    1.13x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

  duckdb appender, count: 100000, chunk size 1024 - bench/appender.bench.ts > appender benches
    1.18x faster than duckdb appender memory, count: 100000, chunk size 2048
    1.21x faster than duckdb appender file, count: 100000, chunk size 2048

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
