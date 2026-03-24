---
"@flowblade/sqlduck": minor
---

Improve getTableFromZod by allowing more types

# DOCTYPES

## Zod -> DuckDB

| Zod | DuckDB |
|---|---|
| `z.string()`, `z.email()`, `z.url()`, `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.iso.date()`, `z.iso.time()` | `VARCHAR` |
| `z.iso.datetime()`, `zodCodecs.dateToString` | `TIMESTAMP` |
| `z.uuid()`, `z.uuidv7()` | `UUID` |
| `z.boolean()` | `BOOLEAN` |
| `z.int32()` | `INTEGER` |
| `z.float32()` | `FLOAT` |
| `z.float64()` | `DOUBLE` |
| `z.number()` | inferred, default `BIGINT` |
| `zodCodecs.bigintToString` | `BIGINT` |

## Numeric inference

- signed: `TINYINT` -> `SMALLINT` -> `INTEGER` -> `BIGINT` -> `HUGEINT`
- unsigned: `UTINYINT` -> `USMALLINT` -> `UINTEGER` -> `UBIGINT` -> `UHUGEINT`
- floats: `FLOAT` if float32 range, else `DOUBLE`

## Notes

- nullable only affects `NOT NULL`
- `meta({ primaryKey: true })` -> `PRIMARY KEY`
- `z.number()` falls back to `BIGINT` without min/max
- nested `z.object(...)` is not supported
