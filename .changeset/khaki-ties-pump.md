---
"@flowblade/sqlduck": minor
---

Support for duckdb list (variable length array) from zod schemas. It automatically detects and 
converts `z.array(z.string())` to `VARCHAR[]`, `z.array(z.number())` to `INTEGER[]`, 
`z.array(z.boolean())` to `BOOLEAN[]`. When automatic inference isn't supported, 
you can provide a custom `duckdbType` for each field. The following custom types are now 
supported: `duckdbType: VARCHAR[] | INTEGER[] | BOOLEAN[] | BIGINT[] | DOUBLE[] | DATE[] | TIMESTAMP[]`.
The complete list of supported types is exported as `SupportedCustomDuckDbTypes`

```typescript
import * as z from 'zod';

export const zodSchema = z.strictObject({
  list_of_strings: z.array(z.string()),
  // Note that for bigints we need to explicitly specify the BIGINT type
  // This is because in openapi, bigints are represented as strings
  list_of_bigints_explicit: z.array(zodCodecs.bigintToString).meta({
    duckdbType: 'BIGINT[]',
  }),
  list_of_numbers: z.array(z.number()),
  list_of_booleans: z.array(z.boolean()),
});
```

Will create the following table:

```sql
CREATE OR REPLACE TABLE test (
    list_of_strings VARCHAR[] NOT NULL,
    list_of_bigints VARCHAR[] NOT NULL,                
    list_of_numbers INTEGER[] NOT NULL,
    list_of_booleans BOOLEAN[] NOT NULL
)
```

## Alternatively 

You can provide a custom `duckdbType` for each field.


