[**@flowblade/source-duckdb v0.16.2**](../README.md)

---

[@flowblade/source-duckdb](../README.md) / DuckdbDatasource

# Class: DuckdbDatasource

## Implements

- `DatasourceInterface`

## Constructors

### Constructor

> **new DuckdbDatasource**(`params`): `DuckdbDatasource`

#### Parameters

##### params

[`DuckdbDatasourceParams`](../type-aliases/DuckdbDatasourceParams.md)

#### Returns

`DuckdbDatasource`

## Methods

### getConnection()

> **getConnection**(): `DuckDBConnection`

Return underlying duckdb connection.

Warning: using the underling driver connection isn't recommended
and not covered by api stability. Use at your own risks.

#### Returns

`DuckDBConnection`

#### Implementation of

`DatasourceInterface.getConnection`

---

### query()

> **query**\<`TData`\>(`rawQuery`, `info?`): `AsyncQResult`\<`TData`\>

Run a raw query on the datasource and return a query result (QResult).

#### Type Parameters

##### TData

`TData` _extends_ `unknown`[]

#### Parameters

##### rawQuery

[`SqlTag`](../type-aliases/SqlTag.md)\<`TData`\>

##### info?

`DatasourceQueryInfo`

#### Returns

`AsyncQResult`\<`TData`\>

#### Example

```typescript
import { DuckdbDatasource } from "@flowblade/source-duckdb";
import { sql } from "@flowblade/sql-tag";

const ds = new DuckdbDatasource({ connection: duckdb });

type ProductRow = {
  productId: number;
};

const rawSql = sql<ProductRow>`
  WITH products(productId) AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
  SELECT productId FROM products
  WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER
`;

const result = await ds.query(rawSql);

const { data, meta, error } = result;

if (data) {
  // Typed as ProductRow[]
  console.log(data);
}
if (error) {
  // Typed as QError
  console.log(error);
}

// Optionally: map over the data to transform it

const { data: mappedData } = result.map((row) => {
  return {
    id: row.productId,
    key: `key-${row.productId}`,
  };
});
```

#### Implementation of

`DatasourceInterface.query`

---

### stream()

> **stream**(`_query`, `options?`): `AsyncIterableIterator`\<`QResult`\<`unknown`[], `QError`\>\>

#### Parameters

##### \_query

`unknown`

##### options?

`DatasourceStreamOptions`

#### Returns

`AsyncIterableIterator`\<`QResult`\<`unknown`[], `QError`\>\>

#### Implementation of

`DatasourceInterface.stream`
