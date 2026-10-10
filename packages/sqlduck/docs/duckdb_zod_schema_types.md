# Zod schema to DuckDB column types

How `@flowblade/sqlduck` maps a Zod schema to DuckDB column types when it
creates a table (`SqlDuck.toTable`, `getTableCreateFromZod`).

Types are inferred from the Zod schema. When the inferred type isn't the one
you want, you can set it explicitly with `.meta({ duckdbType })` (see
[Explicit types](#explicit-types-duckdbtype)).

## Integer

| Zod type                   | DuckDB type | Notes                             |
| -------------------------- | ----------- | --------------------------------- |
| `z.number()`               | `BIGINT`    | No bounds, falls back to `BIGINT` |
| `z.int()`                  | `BIGINT`    |                                   |
| `z.int32()`                | `INTEGER`   |                                   |
| `z.uint32()`               | `UINTEGER`  |                                   |
| `zodCodecs.bigintToString` | `BIGINT`    | Use for `bigint` values           |

When both `.min()` and `.max()` are set on `z.number()` / `z.int()`, the
smallest fitting integer type is used:

| Bounds       | Unsigned (`min >= 0`) | Signed     |
| ------------ | --------------------- | ---------- |
| fits 8 bits  | `UTINYINT`            | `TINYINT`  |
| fits 16 bits | `USMALLINT`           | `SMALLINT` |
| fits 32 bits | `UINTEGER`            | `INTEGER`  |
| fits 64 bits | `UBIGINT`             | `BIGINT`   |
| larger       | `UHUGEINT`            | `HUGEINT`  |

Examples: `z.number().min(0).max(255)` → `UTINYINT`,
`z.number().min(-32768).max(32767)` → `SMALLINT`.

## Float

| Zod type                                                  | DuckDB type | Notes                                  |
| --------------------------------------------------------- | ----------- | -------------------------------------- |
| `z.float32()`                                             | `FLOAT`     |                                        |
| `z.float64()`                                             | `DOUBLE`    |                                        |
| `z.number().min(-1.5).max(1.5)`                           | `FLOAT`     | Fractional bounds within float32 range |
| `z.number().min(-Number.MAX_VALUE).max(Number.MAX_VALUE)` | `DOUBLE`    | Bounds beyond float32 range            |

A `z.number()` with bounds is a float when one of its bounds is fractional,
or when the bounds are too large for any [integer](#integer) type (outside the
`HUGEINT` / `UHUGEINT` range).

## Decimal

| Zod type                                                            | DuckDB type      | Notes                                       |
| ------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| `z.number().multipleOf(0.01)`                                       | `DECIMAL(18,2)`  | Scale taken from `multipleOf`               |
| `z.number().multipleOf(0.01).min(0).max(1_000_000_000_000_000_000)` | `DECIMAL(21,2)`  | Width grows with the bounds (19 digits + 2) |
| `z.number().multipleOf(0.000_000_000_000_000_000_1)`                | `DECIMAL(38,19)` | Scale above 18 uses the max width           |
| `z.number().meta({ duckdbType: "DECIMAL(10,2)" })`                  | `DECIMAL(10,2)`  | Explicit width and scale                    |
| `z.number().meta({ duckdbType: "DECIMAL" })`                        | `DECIMAL(18,3)`  | DuckDB default                              |

A non integer `multipleOf` makes the column a `DECIMAL`:

- the scale is the number of decimals of `multipleOf` (`0.01` → 2, `0.000_000_1` → 7),
  a scale above 38 throws;
- the width is 18 by default, 38 when the scale is above 18;
- when both `.min()` and `.max()` are set, the width grows to fit the integer
  digits of the bounds plus the scale, up to 38. Bounds that don't fit are
  ignored and out of range values are rejected when appending.

## Boolean

| Zod type      | DuckDB type |
| ------------- | ----------- |
| `z.boolean()` | `BOOLEAN`   |

## String

| Zod type                                              | DuckDB type |
| ----------------------------------------------------- | ----------- |
| `z.string()`                                          | `VARCHAR`   |
| `z.email()`                                           | `VARCHAR`   |
| `z.url()`                                             | `VARCHAR`   |
| `z.cuid()` / `z.cuid2()`                              | `VARCHAR`   |
| `z.ulid()`                                            | `VARCHAR`   |
| `z.iso.time()`                                        | `VARCHAR`   |
| `z.uuid()` / `z.uuidv4()` / `z.uuidv7()` / `z.guid()` | `UUID`      |

## Dates

| Zod type                 | DuckDB type    | Accepted values                   |
| ------------------------ | -------------- | --------------------------------- |
| `z.iso.date()`           | `DATE`         | `'YYYY-MM-DD'` string             |
| `z.iso.datetime()`       | `TIMESTAMP_MS` | ISO 8601 string                   |
| `zodCodecs.dateToString` | `TIMESTAMP_MS` | `Date` (encoded to an ISO string) |

`z.date()` can't be used directly, use `zodCodecs.dateToString` instead.

## Enums

Enums are declared inline in the `CREATE TABLE` statement, no reusable type
(`CREATE TYPE`) is created.

| Zod type                      | DuckDB type        | Notes                          |
| ----------------------------- | ------------------ | ------------------------------ |
| `z.enum(['a', 'b'])`          | `ENUM('a', 'b')`   |                                |
| `z.enum(MyStringEnum)`        | `ENUM('a', 'b')`   | TypeScript string enum         |
| `z.enum(MyNumericEnum)`       | `BIGINT`           | DuckDB enums only hold strings |
| `z.array(z.enum(['a', 'b']))` | `ENUM('a', 'b')[]` |                                |

Values that aren't members of the enum are rejected when appending, the
`toTable` call fails with `'x' is not a member of ENUM('a', 'b')`. This
requires `@duckdb/node-api` `>= 1.5.5-r.5`, earlier versions silently stored
the first member instead.

## Arrays

Arrays are mapped to DuckDB lists of the item type.

| Zod type                               | DuckDB type        |
| -------------------------------------- | ------------------ |
| `z.array(z.string())`                  | `VARCHAR[]`        |
| `z.array(z.enum(['a', 'b']))`          | `ENUM('a', 'b')[]` |
| `z.array(z.number())`                  | `BIGINT[]`         |
| `z.array(z.int32())`                   | `INTEGER[]`        |
| `z.array(z.float32())`                 | `FLOAT[]`          |
| `z.array(z.float64())`                 | `DOUBLE[]`         |
| `z.array(z.number().multipleOf(0.01))` | `DECIMAL(18,2)[]`  |
| `z.array(z.boolean())`                 | `BOOLEAN[]`        |
| `z.array(z.uuid())`                    | `UUID[]`           |
| `z.array(z.iso.date())`                | `DATE[]`           |
| `z.array(z.iso.datetime())`            | `TIMESTAMP_MS[]`   |
| `z.array(zodCodecs.bigintToString)`    | `BIGINT[]`         |

Array items are inferred with the same rules as columns.

## Explicit types (`duckdbType`)

`.meta({ duckdbType })` overrides the inferred type:

```ts
const schema = z.object({
  price: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
  ids: z.array(zodCodecs.bigintToString).meta({ duckdbType: "BIGINT[]" }),
});
```

Supported values:

| Group   | `duckdbType`                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Numeric | `INTEGER`, `BIGINT`, `UBIGINT`, `HUGEINT`, `FLOAT`, `DOUBLE`, `DECIMAL` (= `DECIMAL(18,3)`), `DECIMAL(w,s)`                                |
| String  | `VARCHAR`, `UUID`                                                                                                                          |
| Boolean | `BOOLEAN`                                                                                                                                  |
| Dates   | `DATE`, `TIMESTAMP`, `TIMESTAMP_MS`                                                                                                        |
| Arrays  | `VARCHAR[]`, `INTEGER[]`, `BIGINT[]`, `UBIGINT[]`, `BOOLEAN[]`, `FLOAT[]`, `DOUBLE[]`, `UUID[]`, `DATE[]`, `TIMESTAMP[]`, `TIMESTAMP_MS[]` |

`DECIMAL(w,s)` requires a width between 1 and 38 and a scale not greater than
the width.

`TIMESTAMP` accepts the same values as `TIMESTAMP_MS` (ISO strings, `Date`,
epoch milliseconds) and is stored with microsecond precision, sub-millisecond
digits of ISO strings are dropped.

## Nullability and constraints

Nullability doesn't change the DuckDB type, only the column constraint:

| Zod                              | Constraint    |
| -------------------------------- | ------------- |
| required                         | `NOT NULL`    |
| `z.nullable(...)` / `.nullish()` | none          |
| `.meta({ primaryKey: true })`    | `PRIMARY KEY` |

`.optional()` and `.default()` don't make a column nullable, it stays
`NOT NULL`.

## Not supported

| Zod type                                | Behaviour                               |
| --------------------------------------- | --------------------------------------- |
| `z.bigint()`                            | Throws, use `zodCodecs.bigintToString`  |
| `z.date()`                              | Throws, use `zodCodecs.dateToString`    |
| `z.object(...)`                         | Throws, nested objects aren't supported |
| `z.array(z.array(...))`                 | Throws, nested lists aren't supported   |
| `z.union(...)` / mixed TypeScript enums | Throws (`Cannot guess type`)            |
