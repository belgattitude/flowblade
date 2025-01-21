[**@flowblade/core v0.2.5**](../README.md)

***

[@flowblade/core](../README.md) / DatasourceInterface

# Interface: DatasourceInterface

## Properties

### getConnection()

> **getConnection**: () => `any`

#### Returns

`any`

***

### query()

> **query**: (`query`, `info`?) => `Promise`\<[`QResult`](../classes/QResult.md)\<`any`, [`QError`](QError.md)\>\>

#### Parameters

##### query

`any`

##### info?

[`DatasourceQueryInfo`](DatasourceQueryInfo.md)

#### Returns

`Promise`\<[`QResult`](../classes/QResult.md)\<`any`, [`QError`](QError.md)\>\>

***

### stream()

> **stream**: (`query`, `chunkSize`) => `AsyncIterableIterator`

#### Parameters

##### query

`any`

##### chunkSize

`number`

#### Returns

`AsyncIterableIterator`
