---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
---

Add transactions: `transaction()` (returns a QResult) and `transactionOrThrow()`, the callback receives a datasource running its queries in the transaction.

```typescript
const { data, error, meta } = await ds.transaction(
  async (tx) => {
    const { data: order } = await tx.queryOneOrThrow(insertOrder);
    await tx.queryOrThrow(insertOrderLines(order.id));
    return order.id;
  },
  { name: "createOrder", isolationLevel: "serializable" }
);
```

- Committed when the callback returns, rolled back when it throws or calls `tx.rollback(reason)`.
- `transaction()` error codes: `ROLLED_BACK` (the thrown error as cause), `TRANSACTION_FAILED` (begin, commit or rollback failed) and `ABORTED` (with `signal`, never committed).
- `transactionOrThrow()` rethrows the callback error as is, or throws `QErrors.TransactionFailed` / `QErrors.Aborted`, an `onError` factory can replace them.
- The result meta holds a new `transaction` span (`QMetaTransactionSpan`) followed by the spans of the queries run in the transaction.

Core: add `TransactionalDatasourceInterface`, `QErrors.RolledBack`, `QErrors.TransactionFailed`, the `ROLLED_BACK` / `TRANSACTION_FAILED` error codes and `runTransaction()` in `@flowblade/core/datasource` to implement `transaction()` in datasources.
