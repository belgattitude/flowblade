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

### Node 24.19

```
 RUN  v4.1.10 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 4702ms
     name                                                             hz     min     max    mean     p75     p99    p995    p999       rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048       2.9565  297.19  379.28  338.23  379.28  379.28  379.28  379.28  ±154.25%        2
   · duckdb appender file, count: 100000, chunk size 2048         3.2467  302.16  313.84  308.00  313.84  313.84  313.84  313.84   ±24.10%        2
   · duckdb appender file no wal, count: 100000, chunk size 2048  3.5982  272.83  283.01  277.92  283.01  283.01  283.01  283.01   ±23.29%        2
   · duckdb appender file no wal, count: 100000, chunk size 1024  3.1962  307.89  317.86  312.87  317.86  317.86  317.86  317.86   ±20.24%        2
   · duckdb appender, count: 100000, chunk size 1024              3.9457  238.32  268.56  253.44  268.56  268.56  268.56  268.56   ±75.84%        2

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 2768ms
     name                                                                         hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   14.7282  55.8866  117.44  67.8968  66.1927  117.44  117.44  117.44  ±18.84%       10
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  12.1404  62.2024  138.60  82.3693  80.8803  138.60  138.60  138.60  ±26.30%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                    11.5408  79.1225  102.85  86.6494  89.3379  102.85  102.85  102.85   ±5.60%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 613ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  24,208.11  0.0247  5.2321  0.0413  0.0434  0.1512  0.2186  0.7364  ±2.68%    12105

 BENCH  Summary

  duckdb appender, count: 100000, chunk size 1024 - bench/appender.bench.ts > appender benches
    1.10x faster than duckdb appender file no wal, count: 100000, chunk size 2048
    1.22x faster than duckdb appender file, count: 100000, chunk size 2048
    1.23x faster than duckdb appender file no wal, count: 100000, chunk size 1024
    1.33x faster than duckdb appender memory, count: 100000, chunk size 2048

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.21x faster than rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)
    1.28x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)
```

### Bun 1.4.0-dev

```
RUN  v4.1.10 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 4421ms
     name                                                             hz     min     max    mean     p75     p99    p995    p999      rme  samples
   · duckdb appender memory, count: 100000, chunk size 2048       3.6500  271.84  276.10  273.97  276.10  276.10  276.10  276.10   ±9.88%        2
   · duckdb appender file, count: 100000, chunk size 2048         3.6469  272.29  276.12  274.21  276.12  276.12  276.12  276.12   ±8.88%        2
   · duckdb appender file no wal, count: 100000, chunk size 2048  3.6858  271.23  271.39  271.31  271.39  271.39  271.39  271.39   ±0.36%        2
   · duckdb appender file no wal, count: 100000, chunk size 1024  3.8828  245.82  269.28  257.55  269.28  269.28  269.28  269.28  ±57.90%        2
   · duckdb appender, count: 100000, chunk size 1024              4.3164  228.90  233.35  231.68  233.35  233.35  233.35  233.35   ±2.60%        3

 ✓ bench/stream.bench.ts > Bench rowsToColumnsChunks 1944ms
     name                                                                         hz      min      max     mean      p75      p99     p995     p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)                   23.3620  34.5897  57.6520  42.8045  46.5939  57.6520  57.6520  57.6520   ±9.96%       12
   · rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)  19.9773  38.8665  71.6678  50.0569  51.5838  71.6678  71.6678  71.6678  ±14.39%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)                    19.0996  45.5100  66.2385  52.3572  53.0091  66.2385  66.2385  66.2385   ±7.43%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 634ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  30,647.46  0.0177  4.5320  0.0326  0.0335  0.1058  0.1550  0.7740  ±4.73%    15324

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench rowsToColumnsChunks
    1.17x faster than rowToColumnsChunk with transformer with chunkSize 2048 (count: 100000)
    1.22x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  duckdb appender, count: 100000, chunk size 1024 - bench/appender.bench.ts > appender benches
    1.11x faster than duckdb appender file no wal, count: 100000, chunk size 1024
    1.17x faster than duckdb appender file no wal, count: 100000, chunk size 2048
    1.18x faster than duckdb appender memory, count: 100000, chunk size 2048
    1.18x faster than duckdb appender file, count: 100000, chunk size 2048

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
