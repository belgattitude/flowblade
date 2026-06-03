---
"@flowblade/sqlduck": minor
---

Initial support dor DECIMAL(18,3)


```typescript
const testSchema = z.object({
    decimal_18_3: z.float32().meta({
        multipleOf: 0.001,
    }),
});

// Will create a table with a DECIMAL(18,3) column
```