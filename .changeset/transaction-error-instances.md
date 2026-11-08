---
"@flowblade/core": minor
---

Return transaction failures as error class instances so `transaction()` results can be checked with `instanceof`. Add `QErrors.TransactionDomainRollback`, which extends `QErrors.DomainRollback` and preserves the original domain error as its cause. `TransactionQError` now reflects the concrete error classes; `QResult.toJsonifiable()` continues to return the serializable QError fields and message without the runtime cause.

```typescript
import { QErrors } from "@flowblade/core";

const { error } = await ds.transaction(async () => {
  throw new QErrors.DomainRollback("OUT_OF_STOCK", {
    details: { productId: 7 },
  });
});

if (error instanceof QErrors.TransactionDomainRollback) {
  console.log(error.reason, error.details);
  console.log(error.cause instanceof QErrors.DomainRollback);
} else if (error instanceof QErrors.TransactionConflict) {
  // Retry or report the transient conflict.
}
```
