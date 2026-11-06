---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
---

Add transactions: `transaction()` (returns a QResult) and `transactionOrThrow()`, the callback receives a datasource running its queries in the transaction.

```typescript
const {
  data: orderId,
  error,
  meta,
} = await ds.transaction(
  async (tx) => {
    // insertOrder returns the inserted row (ie: RETURNING id)
    const { data: order } = await tx.queryOneOrThrow(insertOrder);
    await tx.queryOrThrow(insertOrderLines(order.id));
    return order.id;
  },
  {
    name: "createOrder",
    isolationLevel: "serializable",
    // serialization failures are expected, run it again on conflict
    retry: { maxRetries: 3 },
  }
);
```

- Committed when the callback returns, rolled back when it throws or calls `tx.rollback(reason)`.
- `transaction()` error codes: `ROLLED_BACK` (the thrown error as cause), `TRANSACTION_FAILED` (begin, commit or rollback failed), `TRANSACTION_CONFLICT` (conflicts with a concurrent transaction, after the `retry` attempts) and `ABORTED` (with `signal`, never committed).
- `transactionOrThrow()` rethrows the callback error as is, or throws `QErrors.TransactionFailed` / `QErrors.TransactionConflict` / `QErrors.Aborted`, an `onError` factory can replace them.
- The result meta holds a new `transaction` span (`QMetaTransactionSpan`) followed by the spans of the queries run in the transaction.

Core: add `TransactionalDatasourceInterface`, `QErrors.RolledBack`, `QErrors.TransactionFailed`, the `ROLLED_BACK` / `TRANSACTION_FAILED` error codes and `runTransaction()` in `@flowblade/core/datasource` to implement `transaction()` in datasources.
