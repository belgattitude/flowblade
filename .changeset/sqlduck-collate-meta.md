---
"@flowblade/sqlduck": minor
---

Support `.meta({ duckdbCollate })` on VARCHAR columns when creating a table from a zod schema, ie: `z.string().meta({ duckdbCollate: "NOCASE" })` generates `VARCHAR COLLATE NOCASE`. Accepts built-in (`NOCASE`, `NOACCENT`, `NFC`), combined (`NOCASE.NOACCENT`) and ICU (`en_US`) collations, other column types are rejected.
