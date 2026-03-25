## @flowblade/sqlduck

> Currently experimental

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


 ✓ bench/appender.bench.ts > appender benches 66030ms
     name                                                  hz        min        max       mean        p75        p99       p995       p999     rme  samples
   · duckdb appender, count: 1000000, chunk size 2048  0.0642  15,577.01  15,577.01  15,577.01  15,577.01  15,577.01  15,577.01  15,577.01  ±0.00%        1
   · duckdb appender, count: 1000000, chunk size 1024  0.0579  17,263.44  17,263.44  17,263.44  17,263.44  17,263.44  17,263.44  17,263.44  ±0.00%        1

 ✓ bench/stream.bench.ts > Bench stream 22923ms
     name                                                        hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 1000000)  1.2126    742.59    906.65    824.67    863.91    906.65    906.65    906.65  ±4.26%       10
   · mapFakeRowStream with chunkSize 2048 (count: 1000000)   0.8049  1,123.18  1,498.68  1,242.43  1,257.91  1,498.68  1,498.68  1,498.68  ±6.40%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 615ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  16,562.93  0.0242  2.5902  0.0604  0.0734  0.2555  0.3741  0.8135  ±2.32%     8282

 BENCH  Summary

  duckdb appender, count: 1000000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.11x faster than duckdb appender, count: 1000000, chunk size 1024

  rowToColumnsChunk with chunkSize 2048 (count: 1000000) - bench/stream.bench.ts > Bench stream
    1.51x faster than mapFakeRowStream with chunkSize 2048 (count: 1000000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

```

### Bun 1.3.11

```
 RUN  v4.1.1 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 36627ms
     name                                                  hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · duckdb appender, count: 1000000, chunk size 2048  0.1177  8,495.41  8,495.41  8,495.41  8,495.41  8,495.41  8,495.41  8,495.41  ±0.00%        1
   · duckdb appender, count: 1000000, chunk size 1024  0.1064  9,397.97  9,397.97  9,397.97  9,397.97  9,397.97  9,397.97  9,397.97  ±0.00%        1

 ✓ bench/stream.bench.ts > Bench stream 23421ms
     name                                                        hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 1000000)  1.1378    801.60  1,080.22    878.91    910.91  1,080.22  1,080.22  1,080.22  ±6.85%       10
   · mapFakeRowStream with chunkSize 2048 (count: 1000000)   0.8118  1,130.36  1,448.99  1,231.78  1,268.45  1,448.99  1,448.99  1,448.99  ±5.34%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 622ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  22,447.94  0.0210  5.4621  0.0445  0.0442  0.1657  0.2167  2.5852  ±5.37%    11224

 BENCH  Summary

  rowToColumnsChunk with chunkSize 2048 (count: 1000000) - bench/stream.bench.ts > Bench stream
    1.40x faster than mapFakeRowStream with chunkSize 2048 (count: 1000000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod

  duckdb appender, count: 1000000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.11x faster than duckdb appender, count: 1000000, chunk size 1024

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
