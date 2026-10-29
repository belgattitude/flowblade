---
"@flowblade/core": minor
"@flowblade/source-kysely": minor
---

`QResult` data is no longer always an array. It holds either:

- the rows, for `query()`: `QResult<Row[]>`,
- the row or `null`, for `queryOne()`: `QResult<Row | null>`.

The API stays the same for both:

- `map()` transforms each row of an array, or the single row (`null` is kept as is, the transform isn't called).
- `InferQResult` infers the data type: `Row[]` or `Row | null`.
- `getOrThrow()` and `toJsonifiable()` return the data as is (ie: `data: null` for a missing row).

```typescript
import type { InferQResult } from "@flowblade/core";

type Row = { id: number; name: string };

const result = await ds.queryOne(
  sql<Row>`SELECT id, name FROM product WHERE id = ${id}`
);
const { data: product, error } = result;
if (error) {
  throw new Error(error.message, { cause: error.cause });
}
// product: Row | null

type Product = InferQResult<typeof result>; // Row | null

// map() transforms the row, null is kept as is
const { data: dto } = result.map((row) => {
  return { ...row, slug: slugify(row.name) };
});
// dto: (Row & { slug: string }) | null
```

**Migration**: `query()` results are unchanged. Only generic code constrained to arrays (ie: `<T extends QResult<unknown[], QError>>`) needs to widen the constraint to `QResult<unknown, QError>` to accept both shapes. `DatasourceHelpers.toJsonified()` from `@flowblade/source-kysely` already accepts both.
