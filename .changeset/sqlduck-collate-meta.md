---
"@flowblade/sqlduck": minor
---

Add `duckdbCollate` to the zod meta and a strictly typed `duckMeta()` helper (`@flowblade/sqlduck/zod`) when creating a table from a zod schema.

- `duckdbCollate` adds a `COLLATE` clause to a `VARCHAR` column: built-in (`NOCASE`, `NOACCENT`, `NFC`), combined (`NOCASE.NOACCENT`) and ICU (`fr`, `en_US`) collations. Any other column type (enum, uuid, number, array...) throws when the table is created.
- `duckdbType`, `duckdbCollate` and `primaryKey` are now typed in `.meta()`: unsupported values are compile errors.
- `duckMeta()` also rejects unknown keys (typos) and `duckdbCollate` on a non VARCHAR `duckdbType`. It returns its argument unchanged.

```typescript
import { duckMeta } from "@flowblade/sqlduck/zod";
import * as z from "zod";

const schema = z.object({
  // PRIMARY KEY
  id: z.int32().meta(duckMeta({ primaryKey: true })),

  // name VARCHAR COLLATE NOCASE NOT NULL
  name: z.string().meta(duckMeta({ duckdbCollate: "NOCASE" })),

  // email VARCHAR COLLATE NOCASE.NOACCENT (nullable)
  email: z
    .string()
    .nullable()
    .meta(duckMeta({ duckdbCollate: "NOCASE.NOACCENT" })),

  // city VARCHAR COLLATE fr NOT NULL (ICU collation)
  city: z.string().meta(duckMeta({ duckdbType: "VARCHAR", duckdbCollate: "fr" })),

  // price DECIMAL(10,2) NOT NULL
  price: z.number().meta(duckMeta({ duckdbType: "DECIMAL(10,2)" })),
});

// Compile errors:
z.string().meta(duckMeta({ duckdbColate: "NOCASE" })); // unknown key (typo)
z.string().meta(duckMeta({ duckdbType: "NOT_A_TYPE" })); // unsupported type
z.string().meta(duckMeta({ duckdbCollate: "NO CASE" })); // invalid collation
z.string().meta(duckMeta({ duckdbType: "UUID", duckdbCollate: "NOCASE" })); // only VARCHAR can be collated
```
