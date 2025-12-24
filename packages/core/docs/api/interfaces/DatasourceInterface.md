[**@flowblade/core v0.2.22**](../README.md)

---

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

---

### query()

> **query**: (`query`, `info?`) => [`AsyncQResult`](../type-aliases/AsyncQResult.md)\<`any`, `any`\>

```typescript
const ds = new Datasource();
```

#### Parameters

##### query

`any`

##### info?

[`DatasourceQueryInfo`](DatasourceQueryInfo.md)

#### Returns

[`AsyncQResult`](../type-aliases/AsyncQResult.md)\<`any`, `any`\>

---

### stream()

> **stream**: (`query`, `options?`) => `AsyncIterableIterator`\<`any`\>

#### Parameters

##### query

`any`

##### options?

[`DatasourceStreamOptions`](../type-aliases/DatasourceStreamOptions.md)

#### Returns

`AsyncIterableIterator`\<`any`\>
