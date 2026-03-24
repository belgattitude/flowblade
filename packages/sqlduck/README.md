## @flowblade/sqlduck

> Currently experimental

## Quick start

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
  onDataAppendedBatchSize: 4096, // Call onDataAppended every 4096 rows
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

### Benchmarks

```
 RUN  v4.1.1 /home/sebastien/github/flowblade/packages/sqlduck


 ✓ bench/appender.bench.ts > appender benches 6396ms
     name                                                 hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · duckdb appender, count: 100000, chunk size 2048  0.6967  1,435.36  1,435.36  1,435.36  1,435.36  1,435.36  1,435.36  1,435.36  ±0.00%        1
   · duckdb appender, count: 100000, chunk size 1024  0.6863  1,457.18  1,457.18  1,457.18  1,457.18  1,457.18  1,457.18  1,457.18  ±0.00%        1

 ✓ bench/stream.bench.ts > Bench stream 2000ms
     name                                                        hz      min     max     mean      p75     p99    p995    p999      rme  samples
   · rowToColumnsChunk with chunkSize 2048 (count: 100000)  13.2020  62.1579  108.09  75.7462  76.3741  108.09  108.09  108.09  ±14.47%       10
   · mapFakeRowStream with chunkSize 2048 (count: 100000)   10.1410  88.9860  112.13  98.6096   106.68  112.13  112.13  112.13   ±6.17%       10

 ✓ bench/table-create.bench.ts > Bench getTableCreateFromZod 613ms
     name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · getTableCreateFromZod  26,049.34  0.0235  1.3650  0.0384  0.0384  0.1470  0.2167  0.6172  ±1.80%    13025

 BENCH  Summary

  duckdb appender, count: 100000, chunk size 2048 - bench/appender.bench.ts > appender benches
    1.02x faster than duckdb appender, count: 100000, chunk size 1024

  rowToColumnsChunk with chunkSize 2048 (count: 100000) - bench/stream.bench.ts > Bench stream
    1.30x faster than mapFakeRowStream with chunkSize 2048 (count: 100000)

  getTableCreateFromZod - bench/table-create.bench.ts > Bench getTableCreateFromZod
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
