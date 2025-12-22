---
"@flowblade/source-kysely": minor
---

Add streaming capabilities

```typescript
import { KyselyDatasource } from '@flowblade/source-kysely';

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
    .selectFrom('brand as b')
    .select(['b.id', 'b.name']);

const stream = ds.stream(query, {
    // Chunksize used when reading the database
    // @default undefined
    chunkSize: undefined
});

for await (const brand of stream) {
    console.log(brand.name)
    if (brand.name === 'Something') {
        // Breaking or returning before the stream has ended will release
        // the database connection and invalidate the stream.
        break
    }
}
```