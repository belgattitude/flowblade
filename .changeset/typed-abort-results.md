---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": minor
---

Add discriminated query error types: `query()` returns `QueryQError`, and
`queryOne()` returns `QueryOneQError`. Checking `error.code` narrows query
failures, aborts, and multiple-row errors without changing the broad `QError`
type. An `ABORTED` error is an `AbortedQError`; its `cause` remains `unknown`
because `AbortSignal.reason` can be any JavaScript value. `QResult.map()`
preserves the original variants and adds `MapFailedQError`.

```typescript
const { error } = await ds.query(query, { signal });
if (error?.code === "ABORTED") {
  // error is AbortedQError. Do not assume its cause is an Error or DOMException.
  console.log(error.cause);
}

const one = await ds.queryOne(query, { signal });
if (one.error?.code === "TOO_MANY_RESULTS") {
  // QueryOneQError discriminates this from a query failure or abort.
  console.log(one.error.cause);
}

const mapped = one.map((row) => ({ id: String(row.id) }));
if (mapped.error?.code === "ABORTED") {
  // Abort narrowing is retained after map().
  console.log(mapped.error.cause);
}
```

The thrown `QErrors.Aborted` wrapper and runtime abort behavior are unchanged;
the original signal reason is still available as `cause`.
