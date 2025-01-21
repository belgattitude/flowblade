[**@flowblade/core v0.2.5**](../README.md)

***

[@flowblade/core](../README.md) / QMeta

# Class: QMeta

## Constructors

### new QMeta()

> **new QMeta**(`params`): [`QMeta`](QMeta.md)

Construct a new span

#### Parameters

##### params

`ConstructorParams`

#### Returns

[`QMeta`](QMeta.md)

#### Example

```typescript
const sqlSpan: QMetaSqlSpan = {
   type: 'sql',
   sql: 'SELECT * FROM users',
   params: [],
   timeMs: 10.334,
   affectedRows: 10
}
const meta = new QMeta({
  spans: sqlSpan
});
```

## Properties

### name?

> `readonly` `optional` **name**: `string`

## Methods

### addSpan()

> **addSpan**(`span`): `void`

#### Parameters

##### span

[`QMetaSpan`](../type-aliases/QMetaSpan.md)

#### Returns

`void`

#### Example

```typescript
const meta = new QMeta();
meta.addSpan({
   type: 'sql',
   sql: 'SELECT * FROM users',
   params: [],
   timeMs: 10.334,
   affectedRows: 10
});
```

***

### getSpans()

> **getSpans**(): `Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\>[]

#### Returns

`Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\>[]

***

### getTotalTimeMs()

> **getTotalTimeMs**(): `number`

Return the total time of all spans.

#### Returns

`number`

#### Example

```typescript
const meta = new QMeta({}).withSpan({
  type: 'map',
  timeMs: 1000,
}).withSpan({
  type: 'map',
  timeMs: 2000,
});
console.log(meta.getTotalTimeMs()); // 3000
```

***

### toJSON()

> **toJSON**(): `object`

Profide a JSON serializable representation of the QMeta instance.

#### Returns

`object`

##### spans

> **spans**: [`QMetaSpan`](../type-aliases/QMetaSpan.md)[]

#### See

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description

***

### withSpan()

> **withSpan**(`span`): [`QMeta`](QMeta.md)

Return a new instance of QMeta with the provided span added.

#### Parameters

##### span

[`QMetaSpan`](../type-aliases/QMetaSpan.md)

#### Returns

[`QMeta`](QMeta.md)

#### Example

```typescript
const sqlSpan: QMetaSqlSpan = {
   type: 'sql',
   sql: 'SELECT * FROM users',
   params: [],
   timeMs: 10.334,
   affectedRows: 10
}
const meta = new QMeta({
  spans: sqlSpan
});
const newMeta = meta.withSpan({
  type: 'transform',
  name: 'calculate user discount',
  timeMs: 5.123,
});
```
