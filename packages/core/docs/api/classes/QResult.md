[**@flowblade/core v0.2.8**](../README.md)

***

[@flowblade/core](../README.md) / QResult

# Class: QResult\<TData, TError\>

## Type Parameters

### TData

`TData` *extends* `unknown`[] \| `undefined`

### TError

`TError` *extends* [`QError`](../interfaces/QError.md) \| `undefined`

## Constructors

### Constructor

> **new QResult**\<`TData`, `TError`\>(`params`): `QResult`\<`TData`, `TError`\>

#### Parameters

##### params

`ConstructorParams`\<`TData`, `TError`\>

#### Returns

`QResult`\<`TData`, `TError`\>

## Properties

### $inferData

> **$inferData**: `TData`

Utility getter to infer the value type of the result.
Note: this getter does not hold any value, it's only used for type inference.

***

### $inferError

> **$inferError**: `TError`

Utility getter to infer the error type of the result.
Note: this getter does not hold any value, it's only used for type inference.

## Accessors

### data

#### Get Signature

> **get** **data**(): `undefined` \| `TData`

##### Returns

`undefined` \| `TData`

***

### error

#### Get Signature

> **get** **error**(): `undefined` \| `TError`

##### Returns

`undefined` \| `TError`

***

### meta

#### Get Signature

> **get** **meta**(): [`QMeta`](QMeta.md)

##### Returns

[`QMeta`](QMeta.md)

## Methods

### isOk()

> **isOk**(): `boolean`

#### Returns

`boolean`

***

### map()

> **map**\<`ReturnType`\>(`fn`): `QResult`\<`ReturnType`[], `undefined`\>

#### Type Parameters

##### ReturnType

`ReturnType`

#### Parameters

##### fn

(`row`) => `ReturnType`

#### Returns

`QResult`\<`ReturnType`[], `undefined`\>

***

### toJsonifiable()

> **toJsonifiable**(): `object`

Allows to transform the result into a JSONifiable object.
Warning if the underlying data isn't serializable (ie: bigint, dates, etc), this method will throw an error.

#### Returns

`object`

##### data?

> `optional` **data**: `TData`

##### error?

> `optional` **error**: `TError`

##### meta

> **meta**: `object`

###### meta.spans

> **spans**: [`QMetaSpan`](../type-aliases/QMetaSpan.md)[]
