[**@flowblade/sqlduck v0.16.0**](../README.md)

***

[@flowblade/sqlduck](../README.md) / SqlDuck

# Class: SqlDuck

## Constructors

### Constructor

> **new SqlDuck**(`params`): `SqlDuck`

#### Parameters

##### params

[`SqlDuckParams`](../type-aliases/SqlDuckParams.md)

#### Returns

`SqlDuck`

## Methods

### toTable()

> **toTable**\<`TSchema`\>(`params`): `Promise`\<`ToTableResult`\>

Create a table from a Zod schema and fill it with data from a row stream.

#### Type Parameters

##### TSchema

`TSchema` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\>

#### Parameters

##### params

[`ToTableParams`](../type-aliases/ToTableParams.md)\<`TSchema`\>

#### Returns

`Promise`\<`ToTableResult`\>

#### Example

```typescript
import * as z from 'zod';

const sqlDuck = new SqlDuck({ conn: duckDbConnection });

// Schema of the table, not that you can use meta to add information
const userSchema = z.object({
 id: z.number().int().meta({ primaryKey: true }),
 name: z.string(),
});

// Async generator function that yields rows to insert
async function* getUserRows(): AsyncIterableIterator<z.infer<typeof userSchema>> {
  // database or api call
}

const result = sqlDuck.toTable({
 table: new Table({ name: 'user', database: 'mydb' }),
 schema: userSchema,
 rowStream: getUserRows(),
 chunkSize: 2048,
 onChunkAppended: ({ totalRows }) => {
   console.log(`Appended ${totalRows} rows so far`);
 },
 createOptions: {
   create: 'CREATE_OR_REPLACE',
 },
});

console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
console.log(`Table created with DDL: ${result.createTableDDL}`);
```
