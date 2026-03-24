# DOCTYPES

Supported Zod to DuckDB type mappings in `@flowblade/sqlduck`.

## Mappings

| Zod type                   | DuckDB type                |
| -------------------------- | -------------------------- |
| `z.string()`               | `VARCHAR`                  |
| `z.email()`                | `VARCHAR`                  |
| `z.url()`                  | `VARCHAR`                  |
| `z.cuid()`                 | `VARCHAR`                  |
| `z.cuid2()`                | `VARCHAR`                  |
| `z.ulid()`                 | `VARCHAR`                  |
| `z.iso.date()`             | `VARCHAR`                  |
| `z.iso.time()`             | `VARCHAR`                  |
| `z.iso.datetime()`         | `TIMESTAMP`                |
| `z.uuid()` / `z.uuidv7()`  | `UUID`                     |
| `z.boolean()`              | `BOOLEAN`                  |
| `z.int32()`                | `INTEGER`                  |
| `z.float32()`              | `FLOAT`                    |
| `z.float64()`              | `DOUBLE`                   |
| `z.number()`               | inferred, default `BIGINT` |
| `zodCodecs.dateToString`   | `TIMESTAMP`                |
| `zodCodecs.bigintToString` | `BIGINT`                   |

## Numeric inference

Integer values are mapped to the smallest fitting DuckDB integer type:

- signed: `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, `HUGEINT`
- unsigned: `UTINYINT`, `USMALLINT`, `UINTEGER`, `UBIGINT`, `UHUGEINT`

Floating-point values are mapped to:

- `FLOAT` if they fit float32 range
- `DOUBLE` otherwise

## Nullability

Nullability does not change the DuckDB type:

- non-nullable -> `NOT NULL`
- nullable -> nullable column
- `meta({ primaryKey: true })` -> `PRIMARY KEY`

## Caveats

- `z.number()` falls back to `BIGINT` when no usable `minimum` / `maximum` is available.
- `z.bigint()` is currently supported through `zodCodecs.bigintToString`.
- Only a few string formats are specialized:
  - `date-time` -> `TIMESTAMP`
  - `int64` -> `BIGINT`
  - `uuid` -> `UUID`
- Nested `z.object(...)` columns are not supported.

## Example

```ts
const schema = z.object({
  id: z.number().meta({ primaryKey: true }), // BIGINT PRIMARY KEY
  name: z.string(), // VARCHAR NOT NULL
  email: z.email().nullable(), // VARCHAR
  score: z.float32(), // FLOAT NOT NULL
  created_at: zodCodecs.dateToString, // TIMESTAMP NOT NULL
  ext_id: z.uuidv7(), // UUID NOT NULL
  big_counter: z.nullable(zodCodecs.bigintToString), // BIGINT
});
```
