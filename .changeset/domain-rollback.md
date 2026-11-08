---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": minor
---

Add `QErrors.DomainRollback` for expected domain rejections that must abort a transaction, separate from unexpected callback and database failures. The non-throwing `transaction()` reports `DOMAIN_ROLLBACK` with the stable `reason`, serializable `details`, and original error as `cause`. `transactionOrThrow()` rethrows the same error instance, so application subclasses remain usable with `instanceof` when their constructors are shared. Across duplicate package copies or realms, use `instanceof QErrors.DomainRollback`; custom subclass constructors are not shared.

```typescript
import { QErrors } from "@flowblade/core";

class OutOfStockError extends QErrors.DomainRollback {
  override readonly name = "OutOfStockError";

  constructor(readonly productId: number) {
    super("OUT_OF_STOCK", { productId });
  }
}

// Return-style: inspect the transaction error code.
const { data, error } = await ds.transaction(async (tx) => {
  const { data: order } = await tx.queryOneOrThrow(createOrder);
  if (order.stock < 1) {
    throw new OutOfStockError(order.id);
  }
  await tx.queryOrThrow(decrementStock(order.id));
  return order.id;
});

if (error?.code === "DOMAIN_ROLLBACK") {
  // reason/details are available on the transaction error.
  console.log(error.reason, error.details);
  // The original custom class is retained at runtime.
  if (error.cause instanceof OutOfStockError) {
    console.log(error.cause.productId);
  }
} else if (error) {
  // Other transaction failures are not domain rejections.
  throw error.cause;
} else {
  console.log(data); // committed
}

// Exception-style: transactionOrThrow() rethrows the same instance.
try {
  await ds.transactionOrThrow(async () => {
    throw new OutOfStockError(7);
  });
} catch (error) {
  if (error instanceof OutOfStockError) {
    console.log(error.productId);
  } else {
    throw error;
  }
}
```

Keep `details` serializable if results cross a process boundary. In `transaction()` results, `cause` is runtime-only and may be absent after serialization; `reason` and `details` are the portable classification.
