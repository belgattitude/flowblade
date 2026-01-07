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

### Local scripts

| Name              | Description                    |
| ----------------- | ------------------------------ |
| `yarn build`      |                                |
| `yarn typecheck`  |                                |
| `yarn lint`       | Check for lint errors          |
| `yarn lint --fix` | Attempt to run linter auto-fix |
| `yarn test-unit`  | Run unit tests                 |
| `yarn test-e2e`   | Run unit tests                 |
