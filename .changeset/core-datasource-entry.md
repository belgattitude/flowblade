---
"@flowblade/core": minor
---

Move the helpers to implement a datasource to a dedicated `@flowblade/core/datasource` entry, to keep the main entry focused on what datasource users need (`import * from "@flowblade/core"`: ~4.43 kB → ~4.17 kB).

Moved: `createQResultSuccess()`, `createQResultError()` and `createSqlSpan()`. The new `toOneRowQResult()` and `getOneRowOrThrow()`, to implement `queryOne()` / `queryOneOrThrow()`, are exported there too.

```typescript
import { QMeta } from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
} from "@flowblade/core/datasource";
```

Breaking change: the moved helpers are no longer exported from `@flowblade/core`, see `UPGRADE.md` to migrate.
