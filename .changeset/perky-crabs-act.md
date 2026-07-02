---
"@flowblade/sqlduck": minor
---

Support custom date when specified as meta

You can now specify a custom date type when using the `duckdbType` meta.
The create table will now use duckdb DATE type instead of VARCHAR.

```typescript
export const testFullSupportedColumnsZodSchema = z.strictObject({
    custom_date_only_type: z.string().meta({
        duckdbType: 'DATE',
    }),
});
```

See https://duckdb.org/docs/lts/sql/data_types/date
