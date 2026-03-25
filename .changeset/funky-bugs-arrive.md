---
"@flowblade/sqlduck": minor
---

Add DuckDatabaseManager to ease common operations

```typescript
import { DuckDatabaseManager } from "@flowblade/sqlduck";
import { conn } from "./db.config.ts";

const dbManager = new DuckDatabaseManager(conn);
const database = await dbManager.attach({
    type: ':memory:', // can be 'duckdb', ...
    alias: 'mydb',
    options: { COMPRESS: 'false' },
});
```
