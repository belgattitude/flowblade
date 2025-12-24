[**@flowblade/core v0.2.22**](../README.md)

---

[@flowblade/core](../README.md) / QMeta

# Class: QMeta

## Constructors

### Constructor

> **new QMeta**(`params`): `QMeta`

Construct a new span

#### Parameters

##### params

`ConstructorParams`

#### Returns

`QMeta`

#### Example

```typescript
const sqlSpan: QMetaSqlSpan = {
  type: "sql",
  sql: "SELECT * FROM users",
  params: [],
  timeMs: 12,
  affectedRows: 10,
};
const meta = new QMeta({
  spans: sqlSpan,
});
```

## Accessors

### name

#### Get Signature

> **get** **name**(): `string` \| `undefined`

##### Returns

`string` \| `undefined`

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
  type: "sql",
  sql: "SELECT * FROM users",
  params: [],
  timeMs: 13,
  affectedRows: 10,
});
```

---

### getLatestSpan()

> **getLatestSpan**(): `Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\> \| `undefined`

Return the most recent span or undefined if non was found

#### Returns

`Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\> \| `undefined`

---

### getSpans()

> **getSpans**(): `Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\>[]

#### Returns

`Readonly`\<[`QMetaSpan`](../type-aliases/QMetaSpan.md)\>[]

---

### getTotalTimeMs()

> **getTotalTimeMs**(): `number`

Return the total time of all spans.

#### Returns

`number`

#### Example

```typescript
const meta = new QMeta({})
  .withSpan({
    type: "map",
    timeMs: 1000,
  })
  .withSpan({
    type: "map",
    timeMs: 2000,
  });
console.log(meta.getTotalTimeMs()); // 3000
```

---

### toJSON()

> **toJSON**(): `QMetaJsonifiable`

Profide a JSON serializable representation of the QMeta instance.

#### Returns

`QMetaJsonifiable`

#### See

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description

---

### withSpan()

> **withSpan**(`span`): `QMeta`

Return a new instance of QMeta with the provided span added.

#### Parameters

##### span

[`QMetaSpan`](../type-aliases/QMetaSpan.md)

#### Returns

`QMeta`

#### Example

```typescript
const sqlSpan: QMetaSqlSpan = {
  type: "sql",
  sql: "SELECT * FROM users",
  params: [],
  timeMs: 13,
  affectedRows: 10,
};
const meta = new QMeta({
  spans: sqlSpan,
});
const newMeta = meta.withSpan({
  type: "transform",
  name: "calculate user discount",
  timeMs: 14,
});
```
