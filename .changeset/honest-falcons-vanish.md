---
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

Create @flowblade/core package

**Warning**: This is a breaking change

Create `@flowblade/core` package to centralize common types and utilities. If you're relying
on `@flowblade/source-kysely` or `@flowblade/source-duckdb`, you'll need to update your imports for 
`QueryResults` and others.

```typescript
import type { QueryResult } from '@flowblade/core';
import type { KyselyDatasource } from '@flowblade/source-kysely';
```

And ensure tha @flowblade/core is installed:

```bash
yarn add @flowblade/core @flowblade/source-kysely kysely
```