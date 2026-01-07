[**@flowblade/sqlduck v0.3.0**](../README.md)

---

[@flowblade/sqlduck](../README.md) / getTableCreateFromZod

# Function: getTableCreateFromZod()

> **getTableCreateFromZod**\<`T`\>(`table`, `schema`, `options?`): `object`

## Type Parameters

### T

`T` _extends_ `ZodObject`\<`$ZodLooseShape`, `$strip`\>

## Parameters

### table

[`Table`](../classes/Table.md)

### schema

`T`

### options?

`TableCreateOptions`

## Returns

`object`

### columnTypes

> **columnTypes**: \[`string`, `DuckDBType`\][]

### ddl

> **ddl**: `string`
