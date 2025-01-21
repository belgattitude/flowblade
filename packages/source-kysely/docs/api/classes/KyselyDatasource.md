[**@flowblade/source-kysely v0.13.8**](../README.md)

***

[@flowblade/source-kysely](../README.md) / KyselyDatasource

# Class: KyselyDatasource\<TDatabase\>

## Type Parameters

• **TDatabase**

## Implements

- `DatasourceInterface`

## Constructors

### new KyselyDatasource()

> **new KyselyDatasource**\<`TDatabase`\>(`params`): [`KyselyDatasource`](KyselyDatasource.md)\<`TDatabase`\>

#### Parameters

##### params

`Params`\<`TDatabase`\>

#### Returns

[`KyselyDatasource`](KyselyDatasource.md)\<`TDatabase`\>

## Accessors

### queryBuilder

#### Get Signature

> **get** **queryBuilder**(): `Pick`\<`Kysely`\<`TDatabase`\>, `"with"` \| `"mergeInto"` \| `"selectFrom"` \| `"selectNoFrom"` \| `"deleteFrom"` \| `"insertInto"` \| `"replaceInto"` \| `"withRecursive"`\>

Return a new Kysely expression builder.

##### Example

```typescript
import { KyselyDatasource } from '@flowblade/source-kysely';

const ds = new KyselyDatasource({ db });

// Kysely Expression builder (query, update, delete, merge...)
const eb = ds.queryBuilder;

const query = eb.selectFrom('brand as b')
                .select(['b.id', 'b.name']);

```

##### Returns

`Pick`\<`Kysely`\<`TDatabase`\>, `"with"` \| `"mergeInto"` \| `"selectFrom"` \| `"selectNoFrom"` \| `"deleteFrom"` \| `"insertInto"` \| `"replaceInto"` \| `"withRecursive"`\>

## Methods

### getConnection()

> **getConnection**(): `Kysely`\<`TDatabase`\>

Return the underlying kysely connection.

Warning: this isn't covered by api stability. Use at your own risks.

#### Returns

`Kysely`\<`TDatabase`\>

#### Implementation of

`DatasourceInterface.getConnection`

***

### query()

> **query**\<`TQuery`, `TData`\>(`query`, `info`?): `Promise`\<`QResult`\<`TData`, `QError`\>\>

Run a query on the datasource and return the result.

#### Type Parameters

• **TQuery** *extends* `KyselyQueryOrRawQuery`\<`unknown`\>

• **TData** *extends* `unknown`[] = `KyselyInferQueryOrRawQuery`\<`TQuery`\>

#### Parameters

##### query

`TQuery`

##### info?

`DatasourceQueryInfo`

#### Returns

`Promise`\<`QResult`\<`TData`, `QError`\>\>

#### Example

```typescript
import { KyselyDatasource, isQueryResultError } from '@flowblade/source-kysely';

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
        .selectFrom('brand as b')
        .select(['b.id', 'b.name'])
        .leftJoin('product as p', 'p.brand_id', 'b.id')
        .select(['p.id as product_id', 'p.name as product_name'])
        .where('b.created_at', '<', new Date())
        .orderBy('b.name', 'desc');

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
   ...data
   key: `key-${row.productId}`
})
```

#### Implementation of

`DatasourceInterface.query`

***

### stream()

> **stream**\<`TQuery`, `TData`\>(`_query`, `_chunkSize`): `AsyncIterableIterator`\<`QResult`\<`TData`, `QError`\>\>

#### Type Parameters

• **TQuery** *extends* `KyselyQueryOrRawQuery`\<`unknown`\>

• **TData** *extends* `unknown`[] = `KyselyInferQueryOrRawQuery`\<`TQuery`\>

#### Parameters

##### \_query

`TQuery`

##### \_chunkSize

`number`

#### Returns

`AsyncIterableIterator`\<`QResult`\<`TData`, `QError`\>\>

#### Implementation of

`DatasourceInterface.stream`
