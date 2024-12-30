---
"@flowblade/sql-tag": minor
---

Initial @flowblade/sql-tag release

## Install

```bash
yarn add @flowblade/sql-tag
```
## Usage

```typescript
import { sql } from '@flowblade/sql-tag';

// 👈 Unvalidated parameters
const params = {
    country: 'BE',
    users: ['John', 'Doe'],
    ids: [1],
};

const query = sql<{
    id: number;
    username: string;
}>`
   SELECT id, username FROM users 
   WHERE country = ${params.country}           -- 👈 simple
   AND username IN (${sql.join(params.users)}) -- 👈 sql.join
      
   -- 👇 conditional clause with sql.empty
   ${params.ids.length > 0 ? sql`AND id IN (${sql.join(params.ids)})` : sql.empty}          
`;

// query.sql === "SELECT id, username FROM users WHERE country = ? AND username IN (?, ?) AND id IN (?)";
// query.values === ['BE', 'John', 'Doe', 1];
```

