---
"@flowblade/sqlduck": minor
---

Add support for z.iso.date() and duckdb DATE type in table creation

```typescript
const useSchema = z.object({
  name: z.string(),
  birth_date: z.iso.date(),  // this will create a duckdb DATE column
  first_commit_date: z.nullable(z.iso.date()),  // this will create a duckdb nullable DATE column
});
```

Also note tha