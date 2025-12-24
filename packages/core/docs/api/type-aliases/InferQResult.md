[**@flowblade/core v0.2.22**](../README.md)

---

[@flowblade/core](../README.md) / InferQResult

# Type Alias: InferQResult\<T\>

> **InferQResult**\<`T`\> = `T` _extends_ [`AsyncQResult`](AsyncQResult.md)\<infer AsyncData, infer \_AsyncErr\> ? `NonNullable`\<`AsyncData`\>\[`number`\][] : `T` _extends_ [`QResult`](../classes/QResult.md)\<infer Data, infer \_Err\> ? `NonNullable`\<`Data`\>\[`number`\][] : `never`

## Type Parameters

### T

`T`
