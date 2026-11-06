---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
"@flowblade/source-duckdb": minor
---

Set the transaction retry policy in the datasource constructors, and configure the backoff jitter.

```typescript
import { createExponentialBackoff } from "@flowblade/core";

const ds = new KyselyDatasource({
  connection: db,
  defaultOptions: {
    transaction: {
      retry: {
        maxRetries: 3,
        // 0-100ms, 0-200ms then 0-400ms
        delayMs: createExponentialBackoff({
          initialDelayMs: 100,
          maxDelayMs: 2000,
          jitter: "full",
        }),
      },
    },
  },
});
```

- New `defaultOptions.transaction.retry` datasource param (`TransactionDefaultOptions`), used by `transaction()` and `transactionOrThrow()`: the `retry` fields passed per transaction win (ie: `{ maxRetries: 0 }` disables the retries, a per transaction `maxRetries` keeps the default `delayMs`).
- `@flowblade/core`: new `createExponentialBackoff({ initialDelayMs, maxDelayMs, jitter })` retry delay factory (defaults: 50ms, 1s, `"equal"`), `jitter` is `"equal"` (half of the delay is random), `"full"` (the whole delay) or `"none"`. `runTransaction()` takes a `defaultRetry` param.
