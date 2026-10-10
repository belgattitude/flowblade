---
"@flowblade/sqlduck": minor
---

Add experimental `withMaterializedKyselyQuery` and `KyselyQueryWithZodSchema` to
`@flowblade/sqlduck/kysely`

> ⚠️ **Experimental**: the materialized query API is not stable yet and may
> change in a minor release.

`withMaterializedKyselyQuery` streams the rows of a Kysely query (e.g. from
mssql or postgres) into a temporary DuckDB table, runs your query on it, then
drops the table, whether the query succeeds, fails or throws.

- `KyselyQueryWithZodSchema` pairs a Kysely select query with the zod schema
  used to create the temporary table. TypeScript reports an error when the
  schema doesn't match the selected columns. Use `getQuery()` and `getSchema()`
  to read them back.
- the temporary table can be created in a specific `database` (e.g. an attached
  file database) and `schema`. Both must be valid, non-reserved DuckDB
  identifiers, otherwise an error result is returned and the query isn't run.
- on success, a `materialization` span (ddl, affectedRows, timeMs, tableName) is
  prepended to the result meta. It relies on the new `@flowblade/core` span
  features: `QMetaMaterializationSpan` and `QMeta.prependSpan()`.
- materialization errors are returned as a `QResult` error.

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

// Target duckdb connection
const instance = await DuckDBInstance.create();
const conn = await instance.connect();

const table = new KyselyQueryWithZodSchema({
    query: db.selectFrom("user").select(["id", "name"]),
    schema: z.strictObject({ id: z.int32(), name: z.string() }),
});

const result = await withMaterializedKyselyQuery({
    duckConn: conn, // DuckDBConnection or DuckdbDatasource
    table,
    query: ({ dsDuck, table }) =>
        dsDuck.query(
            sql<{ id: number; name: string }>`
                SELECT id, name FROM ${sql.raw(table.getFullName())} WHERE id < 1000
            `
        ),
});
```

`ensureZodTableSchema<Row>()` (from `@flowblade/sqlduck/zod`) now accepts row
types with arrays of dates (e.g. `Date[]` or `(Date | null)[]`). Before, such a
`Row` was rejected with `Type 'Row' does not satisfy the constraint`.

```typescript
import { ensureZodTableSchema } from "@flowblade/sqlduck/zod";
import * as z from "zod";

type Row = { id: number; dates: Date[] };

const schema = ensureZodTableSchema<Row>(
    z.strictObject({ id: z.number(), dates: z.array(z.date()) })
);
```
