---
"@flowblade/sql-tag": patch
---

- Improve README with recipes for conditionals and query composition
- Add `sql.if` helper for alternative conditional syntax.

```typescript
import { sql } from '@flowblade/sql-tag';

// 👈 User provided parameters
const userIds = [1, 2];

const query = sql<{ // 👈 optionally type the result
    id: number;
    username: string;
}>`
   SELECT id, username FROM users 
   WHERE 1=1 
   -- 👇 alternative 2: with ternary operator and sql.empty
   ${userIds.length > 0 ? sql`AND id IN (${sql.join(userIds)})` : sql.empty}
   
   -- 👇 alternative 2: with usage of sql.if helper
   ${sql.if(
     userIds.length,
     () => sql`AND id IN (${sql.join(userIds)})`
   )}                     
`;

// query.sql === "SELECT id, username FROM users WHERE 1=1 AND id IN (?, ?)";
// query.values === [1, 2];
```

