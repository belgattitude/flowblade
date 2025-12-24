[**@flowblade/source-kysely v0.17.0**](../README.md)

---

[@flowblade/source-kysely](../README.md) / KyselyDatasource

# Class: KyselyDatasource\<TDatabase\>

## Type Parameters

### TDatabase

`TDatabase`

## Implements

- `DatasourceInterface`

## Constructors

### Constructor

> **new KyselyDatasource**\<`TDatabase`\>(`params`): `KyselyDatasource`\<`TDatabase`\>

#### Parameters

##### params

`Params`\<`TDatabase`\>

#### Returns

`KyselyDatasource`\<`TDatabase`\>

## Accessors

### queryBuilder

#### Get Signature

> **get** **queryBuilder**(): `Pick`\<`Kysely`\<`TDatabase`\>, `"mergeInto"` \| `"selectFrom"` \| `"selectNoFrom"` \| `"deleteFrom"` \| `"updateTable"` \| `"insertInto"` \| `"replaceInto"` \| `"with"` \| `"withRecursive"` \| `"withSchema"` \| `"withPlugin"` \| `"withoutPlugins"` \| `"withTables"`\>

Return a new Kysely expression builder.

##### Example

```typescript
import { KyselyDatasource } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ db });

// Kysely Expression builder (query, update, delete, merge...)
const eb = ds.queryBuilder;

const query = eb.selectFrom("brand as b").select(["b.id", "b.name"]);
```

##### Returns

`Pick`\<`Kysely`\<`TDatabase`\>, `"mergeInto"` \| `"selectFrom"` \| `"selectNoFrom"` \| `"deleteFrom"` \| `"updateTable"` \| `"insertInto"` \| `"replaceInto"` \| `"with"` \| `"withRecursive"` \| `"withSchema"` \| `"withPlugin"` \| `"withoutPlugins"` \| `"withTables"`\>

## Methods

### getConnection()

> **getConnection**(): `Kysely`\<`TDatabase`\>

Return the underlying kysely connection.

Warning: this isn't covered by api stability. Use at your own risks.

#### Returns

`Kysely`\<`TDatabase`\>

#### Implementation of

`DatasourceInterface.getConnection`

---

### query()

> **query**\<`TQuery`, `TData`\>(`query`, `info?`): `Promise`\<`QResult`\<`TData`, `QError`\>\>

Run a query on the datasource and return the result.

#### Type Parameters

##### TQuery

`TQuery` _extends_ `KyselyQueryOrRawQuery`\<`unknown`\>

##### TData

`TData` _extends_ `unknown`[] = `KyselyInferQueryOrRawQuery`\<`TQuery`\>

#### Parameters

##### query

`TQuery`

##### info?

`DatasourceQueryInfo`

#### Returns

`Promise`\<`QResult`\<`TData`, `QError`\>\>

#### Example

```typescript
import { KyselyDatasource, isQueryResultError } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"])
  .leftJoin("product as p", "p.brand_id", "b.id")
  .select(["p.id as product_id", "p.name as product_name"])
  .where("b.created_at", "<", new Date())
  .orderBy("b.name", "desc");

const result = await ds.query(query);

// Or with query information (will be sent in the metadata)
// const result = await ds.query(query, {
//  name: 'getBrands'
// });

const result = await ds.query(rawSql);

// Option 1: the QResult object contains the data, metadata and error
//  - data:  the result rows (TData or undefined if error)
//  - error: the error (QError or undefined if success)
//  - meta:  the metadata (always present)

const { data, meta, error } = result;

// Option 2: You operate over the result, ie: mapping the data

const { data } = result.map((row) => {
  return {
    ...row,
    key: `key-${row.productId}`,
  };
});
```

#### Implementation of

`DatasourceInterface.query`

---

### stream()

> **stream**\<`TQuery`, `TData`\>(`query`, `options?`): `AsyncIterableIterator`\<`TData`\[`0`\]\>

Stream query

#### Type Parameters

##### TQuery

`TQuery` _extends_ `KyselyQueryOrRawQuery`\<`unknown`\>

##### TData

`TData` _extends_ `unknown`[] = `KyselyInferQueryOrRawQuery`\<`TQuery`\>

#### Parameters

##### query

`TQuery`

##### options?

`DatasourceStreamOptions`

#### Returns

`AsyncIterableIterator`\<`TData`\[`0`\]\>

#### Example

```typescript
import { KyselyDatasource } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"])
  .leftJoin("product as p", "p.brand_id", "b.id")
  .select(["p.id as product_id", "p.name as product_name"])
  .where("b.created_at", "<", new Date())
  .orderBy("b.name", "desc");

const stream = ds.stream(query, {
  // Chunksize used when reading the database
  // @default undefined
  chunkSize: undefined,
});

for await (const brand of stream) {
  console.log(brand.name);
  if (brand.name === "Something") {
    // Breaking or returning before the stream has ended will release
    // the database connection and invalidate the stream.
    break;
  }
}
```

#### Implementation of

`DatasourceInterface.stream`
