[**@flowblade/source-duckdb v0.1.8**](../README.md)

***

[@flowblade/source-duckdb](../README.md) / DuckdbDatasource

# Class: DuckdbDatasource

## Implements

- `DatasourceInterface`

## Constructors

### new DuckdbDatasource()

> **new DuckdbDatasource**(`params`): [`DuckdbDatasource`](DuckdbDatasource.md)

#### Parameters

##### params

[`DuckdbDatasourceParams`](../type-aliases/DuckdbDatasourceParams.md)

#### Returns

[`DuckdbDatasource`](DuckdbDatasource.md)

## Methods

### getConnection()

> **getConnection**(): `Database`

Return underlying duckdb connection.

Warning: using the underling driver connection isn't recommended
         and not covered by api stability. Use at your own risks.

#### Returns

`Database`

#### Implementation of

`DatasourceInterface.getConnection`

***

### query()

> **query**\<`TData`\>(`rawQuery`, `info`?): `Promise`\<`QResult`\<`TData`, `QError`\>\>

Run a raw query on the datasource and return a query result (QResult).

#### Type Parameters

• **TData** *extends* `unknown`[]

#### Parameters

##### rawQuery

`SqlTag`\<`TData`\>

##### info?

`DatasourceQueryInfo`

#### Returns

`Promise`\<`QResult`\<`TData`, `QError`\>\>

#### Example

```typescript
import { DuckdbDatasource } from '@flowblade/source-duckdb';
import { sql } from '@flowblade/sql-tag';

const ds = new DuckdbDatasource({ connection: duckdb });

const rawSql = sql<{productId: number}>`
  WITH products(productId) AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
  SELECT productId FROM products
  WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER
`;

const result = await ds.query(rawSql);

// Option 1: the QResult object contains the data, metadata and error
//  - data:  the result rows (TData or undefined if error)
//  - error: the error (QError or undefined if success)
//  - meta:  the metadata (always present)

const { data, meta, error } = result;

// Option 2: You operate over the result, ie: mapping the data

const { data } = result.map((row) => {
  return {
   id: row.productId,
   key: `key-${row.productId}`
})
```

#### Implementation of

`DatasourceInterface.query`

***

### stream()

> **stream**(`_query`, `_chunkSize`): `AsyncIterableIterator`\<`QResult`\<`unknown`[], `QError`\>\>

#### Parameters

##### \_query

`unknown`

##### \_chunkSize

`number`

#### Returns

`AsyncIterableIterator`\<`QResult`\<`unknown`[], `QError`\>\>

#### Implementation of

`DatasourceInterface.stream`
