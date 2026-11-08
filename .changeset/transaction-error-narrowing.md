---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": minor
---

Narrow the `transaction()` result to the exported `TransactionQError` union.
Checking its `code` now narrows transaction-specific fields; the
`DOMAIN_ROLLBACK` variant has `reason`, `details`, and an optional typed
`QErrors.DomainRollback` cause. The generic `QError` type remains broad.

```typescript
const { data, error } = await ds.transaction(async (tx) => {
  await tx.queryOrThrow(query);
  return "committed";
});

if (error?.code === "DOMAIN_ROLLBACK") {
  console.log(error.reason, error.details);
  // `cause` is runtime-only and may be absent from deserialized results.
} else if (error?.code === "TRANSACTION_CONFLICT") {
  // A transient conflict may be retried according to transaction options.
} else if (error) {
  // ROLLED_BACK, TRANSACTION_FAILED, or ABORTED.
  console.error(error.code, error.cause);
} else {
  console.log(data);
}
```

This is a type-level refinement of the transaction result. Runtime transaction
behavior and the meaning of the existing error codes are unchanged.
