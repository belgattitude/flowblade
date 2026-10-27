---
"@flowblade/core": minor
---

`QResult` is now a discriminated union: checking `error` narrows `data` (and the other way around), even after destructuring.

```typescript
const { data, error } = await ds.query(sql<{ id: number }>`SELECT 1 as id`);
if (error) {
  return console.error(error.message);
}
// data is typed { id: number }[], no longer `| undefined`
```

`QResult.map()` now returns `QResult<TMappedRow[], TError | QError>` instead of `QResult<TMappedRow[] | undefined, TError | undefined>`.
