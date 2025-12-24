[**@flowblade/core v0.2.22**](../README.md)

---

[@flowblade/core](../README.md) / QResult

# Class: QResult\<TData, TError\>

## Type Parameters

### TData

`TData` _extends_ `unknown`[] \| `undefined`

### TError

`TError` _extends_ [`QError`](../type-aliases/QError.md) \| `undefined`

## Constructors

### Constructor

> **new QResult**\<`TData`, `TError`\>(`params`): `QResult`\<`TData`, `TError`\>

Create a new QResult object.

#### Parameters

##### params

`ConstructorParams`\<`TData`, `TError`\>

#### Returns

`QResult`\<`TData`, `TError`\>

#### Example

```typescript
const initialSqlSpan: QMetaSqlSpan = {
  type: "sql",
  timeMs: 13,
  sql: "SELECT name FROM users",
  affectedRows: 10,
  params: [],
};

type SuccessPayload = [{ name: string }];

// Example for a successful result
const successResult = new QResult({
  data: [{ name: "Seb" }],
  meta: new QMeta({
    spans: initialSqlSpan,
  }),
});

// 👇 You can dereference, data, meta and error

const { data, meta, error } = result;
if (data) {
  // typed in this case to SuccessPayload
  console.log(data); // [{ name: 'Seb' }]
}

if (error) {
  // typed in this case to QError
  console.error(error); // QError object
}

const failureResult = new QResult<SuccessPayload, QError>({
  error: {
    message: "Error message",
  },
  meta: new QMeta({
    spans: initialSqlSpan,
  }),
});

failureResult.isError(); // 👈 true
failureResult.error; // 👈 QError
failureResult.data; // 👈 undefined

// Helpers

failureResult.getOrThrow(); // 👈 throw Error('Error message')

// 👇 Customize the error and throws
failureResult.getOrThrow((qErr) => {
  return new HttpServiceUnavailable({
    cause: new Error(qErr.message),
  });
});
```

## Properties

### $inferData

> **$inferData**: `TData`

Utility getter to infer the value type of the result.
Note: this getter does not hold any value, it's only used for type inference.

---

### $inferError

> **$inferError**: `TError`

Utility getter to infer the error type of the result.
Note: this getter does not hold any value, it's only used for type inference.

## Accessors

### data

#### Get Signature

> **get** **data**(): `TData` \| `undefined`

Access the success data or undefined

##### Returns

`TData` \| `undefined`

---

### error

#### Get Signature

> **get** **error**(): `TError` \| `undefined`

Access the error data or undefined

##### Returns

`TError` \| `undefined`

---

### meta

#### Get Signature

> **get** **meta**(): [`QMeta`](QMeta.md)

Return meta information about the query result.

This generally includes the query execution time,
affected rows, and other metadata.

```typescript
const initialSqlSpan: QMetaSqlSpan = {
  type: "sql",
  timeMs: 10.334,
  sql: "SELECT name FROM users",
  affectedRows: 10,
  params: [],
};

const result = new QResult({
  data: [{ name: "Seb" }],
  meta: new QMeta({
    spans: initialSqlSpan,
  }),
});

const { meta } = result;
```

##### Returns

[`QMeta`](QMeta.md)

## Methods

### getOrThrow()

> **getOrThrow**(`customErrorFn?`): `TData`

Get (unwrap) the success value or throw an error with the QError message.

#### Parameters

##### customErrorFn?

(`qError`) => `Error`

#### Returns

`TData`

#### Example

```typescript
const failureResult = new QResult<SuccessPayload, QError>({
  error: {
    message: "Error message",
  },
});

failureResult.getOrThrow(); // 👈 throw Error('Error message')

// 👇 Customize the error and throws
failureResult.getOrThrow((qErr) => {
  return new HttpServiceUnavailable({
    cause: new Error(qErr.message),
  });
});
```

#### Throws

Error if the result is a failure

---

### isError()

> **isError**(): `boolean`

Check whether the result is an error

#### Returns

`boolean`

---

### isOk()

> **isOk**(): `boolean`

Check whether the result is a success

#### Returns

`boolean`

---

### map()

> **map**\<`TMappedRow`\>(`transformFn`): `QResult`\<`TMappedRow`[] \| `undefined`, `TError` \| `undefined`\>

Transforms the value of a successful result using the transform callback.

The transform function will add a span to the metas to allow access to metrics

Map transform is never applied on failure results.

#### Type Parameters

##### TMappedRow

`TMappedRow` _extends_ `Record`\<`string`, `unknown`\>

#### Parameters

##### transformFn

(`row`) => `TMappedRow`

#### Returns

`QResult`\<`TMappedRow`[] \| `undefined`, `TError` \| `undefined`\>

#### Example

```typescript
const result = new QResult({
  data: [{ name: "Seb" }],
});

const newResult = result.map((row) => {
  // In case of error you can throw
  return {
    name: row.name.length,
    capitalized: row.name.toUpperCase(),
  };
});

// 👇 Type of the new result will properly be inferred as
// QResult<{ name: number; capitalized: string }[] | undefined, QError | undefined>

// 👇 A new span of type 'map' will be appended to the meta, allowing
//    access to performance metrics

console.log(newResult.meta.getLatestSpan()); // { type: 'map', timeMs: 10 }
```

---

### toJsonifiable()

> **toJsonifiable**(): [`QResultJsonifiable`](../type-aliases/QResultJsonifiable.md)\<`TData`, `TError`\>

Transforms the result into a JSON-serializable object with `data`, `error`, and `meta`.

```typescript
const initialSqlSpan: QMetaSqlSpan = {
  type: "sql",
  timeMs: 15,
  sql: "SELECT name FROM users",
  affectedRows: 10,
  params: [],
};

const result = new QResult({
  data: [{ name: "Seb" }],
  meta: new QMeta({
    spans: initialSqlSpan,
  }),
});
const jsonifiable = result.toJsonifiable();
```

#### Returns

[`QResultJsonifiable`](../type-aliases/QResultJsonifiable.md)\<`TData`, `TError`\>
