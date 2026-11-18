---
"@flowblade/sqlduck": minor
---

Add `memoryLimit` and `threads` validators to `duckValidatorsZod` (`@flowblade/sqlduck/zod`) and `duckValidatorsValibot` (`@flowblade/sqlduck/valibot`). The schemas are also exported on their own (`duckMemoryLimitZodSchema`, `duckThreadsZodSchema`, `duckMemoryLimitValibotSchema`, `duckThreadsValibotSchema`).

- `memoryLimit` accepts the formats DuckDB's `memory_limit` setting understands: a decimal number with a KB, MB, GB, TB (1000^i) or KiB, MiB, GiB, TiB (1024^i) unit, case-insensitive, optional space (e.g. `"512MB"`, `"2.7GB"`, `"4 GiB"`), or a percentage of system memory (e.g. `"80%"`).
- `threads` accepts a positive integer string (e.g. `"4"`).

The nextjs-app example now uses them for `DUCKDB_MEMORY_LIMIT` and `DUCKDB_THREADS`, so values like `"2.7GB"` no longer fail env validation.

```typescript
import { duckValidatorsZod } from "@flowblade/sqlduck/zod";

duckValidatorsZod.memoryLimit.parse("2.7GB"); // ok
duckValidatorsZod.threads.parse("4"); // ok
```
