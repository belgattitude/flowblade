[**@flowblade/core v0.2.8**](../README.md)

***

[@flowblade/core](../README.md) / DatasourceInterface

# Interface: DatasourceInterface

## Properties

### getConnection()

> **getConnection**: () => `any`

Return underlying duckdb connection.

Warning: using the underling driver connection isn't recommended
         and not covered by api stability. Use at your own risks.

#### Returns

`any`

***

### query()

> **query**: (`query`, `info?`) => [`AsyncQResult`](../type-aliases/AsyncQResult.md)\<`any`, `any`\>

#### Parameters

##### query

`any`

##### info?

[`DatasourceQueryInfo`](DatasourceQueryInfo.md)

#### Returns

[`AsyncQResult`](../type-aliases/AsyncQResult.md)\<`any`, `any`\>

***

### stream()

> **stream**: (`query`, `chunkSize`) => `AsyncIterableIterator`\<`any`\>

#### Parameters

##### query

`any`

##### chunkSize

`number`

#### Returns

`AsyncIterableIterator`\<`any`\>
