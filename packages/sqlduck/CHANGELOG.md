# @flowblade/sqlduck

## 0.16.0

### Minor Changes

- [#1047](https://github.com/belgattitude/flowblade/pull/1047) [`c25cdba`](https://github.com/belgattitude/flowblade/commit/c25cdbaf6e33a6df85e26bf01cd39c82246ad8ad) Thanks [@belgattitude](https://github.com/belgattitude)! - Replace duckdb timestamp by TIMESTAMP_MS in table creation

- [#1047](https://github.com/belgattitude/flowblade/pull/1047) [`c25cdba`](https://github.com/belgattitude/flowblade/commit/c25cdbaf6e33a6df85e26bf01cd39c82246ad8ad) Thanks [@belgattitude](https://github.com/belgattitude)! - Support TINYINT when values are in the -127/128 range

- [#1047](https://github.com/belgattitude/flowblade/pull/1047) [`c25cdba`](https://github.com/belgattitude/flowblade/commit/c25cdbaf6e33a6df85e26bf01cd39c82246ad8ad) Thanks [@belgattitude](https://github.com/belgattitude)! - Add support for zod.enum

- [#1047](https://github.com/belgattitude/flowblade/pull/1047) [`c25cdba`](https://github.com/belgattitude/flowblade/commit/c25cdbaf6e33a6df85e26bf01cd39c82246ad8ad) Thanks [@belgattitude](https://github.com/belgattitude)! - Improve conversion a string dates

## 0.15.0

### Minor Changes

- [#1045](https://github.com/belgattitude/flowblade/pull/1045) [`88cc68d`](https://github.com/belgattitude/flowblade/commit/88cc68db8929bbe16719f3f6a0c0b008999df905) Thanks [@belgattitude](https://github.com/belgattitude)! - Add createDatabaseFile util

## 0.14.0

### Minor Changes

- [#1043](https://github.com/belgattitude/flowblade/pull/1043) [`3183d6c`](https://github.com/belgattitude/flowblade/commit/3183d6c739864c3cf422a748cef4963a636cb17f) Thanks [@belgattitude](https://github.com/belgattitude)! - Initial support for valibot

- [#1043](https://github.com/belgattitude/flowblade/pull/1043) [`3183d6c`](https://github.com/belgattitude/flowblade/commit/3183d6c739864c3cf422a748cef4963a636cb17f) Thanks [@belgattitude](https://github.com/belgattitude)! - Expose parseDuckDSNZod utility

### Patch Changes

- [#1043](https://github.com/belgattitude/flowblade/pull/1043) [`3183d6c`](https://github.com/belgattitude/flowblade/commit/3183d6c739864c3cf422a748cef4963a636cb17f) Thanks [@belgattitude](https://github.com/belgattitude)! - DatabaseManager change loglevel to debug by default

## 0.13.0

### Minor Changes

- [#1041](https://github.com/belgattitude/flowblade/pull/1041) [`903b7dc`](https://github.com/belgattitude/flowblade/commit/903b7dc7cfe59e093cb171ae79efd5e4c189a615) Thanks [@belgattitude](https://github.com/belgattitude)! - Ensure autoCheckpointing is called for every chunk appended

  This can reduce memory usage by 100x depending on the source data.

## 0.12.0

### Minor Changes

- [#1038](https://github.com/belgattitude/flowblade/pull/1038) [`678b5fa`](https://github.com/belgattitude/flowblade/commit/678b5fa2a310692c592bc211eec3f5687d033862) Thanks [@belgattitude](https://github.com/belgattitude)! - Export /zod schemas for validation with zod

- [#1038](https://github.com/belgattitude/flowblade/pull/1038) [`678b5fa`](https://github.com/belgattitude/flowblade/commit/678b5fa2a310692c592bc211eec3f5687d033862) Thanks [@belgattitude](https://github.com/belgattitude)! - Move to esm only.

## 0.11.0

### Minor Changes

- [#1036](https://github.com/belgattitude/flowblade/pull/1036) [`82c8f2d`](https://github.com/belgattitude/flowblade/commit/82c8f2d7642e5adae9b8df0938b13c99469c0a63) Thanks [@belgattitude](https://github.com/belgattitude)! - Add DuckDatabaseManager to ease common operations

  ```typescript
  import { DuckDatabaseManager } from "@flowblade/sqlduck";
  import { conn } from "./db.config.ts";

  const dbManager = new DuckDatabaseManager(conn);
  const database = await dbManager.attach({
    type: ":memory:", // can be 'duckdb', ...
    alias: "mydb",
    options: { COMPRESS: "false" },
  });
  ```

## 0.10.0

### Minor Changes

- [#1034](https://github.com/belgattitude/flowblade/pull/1034) [`30a7f86`](https://github.com/belgattitude/flowblade/commit/30a7f86995ce3be69046b2911a7d35d4f5c48f0e) Thanks [@belgattitude](https://github.com/belgattitude)! - Add @logtape/logtape support

## 0.9.0

### Minor Changes

- [#1032](https://github.com/belgattitude/flowblade/pull/1032) [`dbd56d4`](https://github.com/belgattitude/flowblade/commit/dbd56d4818bf721c477739252146d21ad37b319e) Thanks [@belgattitude](https://github.com/belgattitude)! - Improve getTableFromZod by allowing more types

  # DOCTYPES

  ## Zod -> DuckDB

  | Zod                                                                                                       | DuckDB                     |
  | --------------------------------------------------------------------------------------------------------- | -------------------------- |
  | `z.string()`, `z.email()`, `z.url()`, `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.iso.date()`, `z.iso.time()` | `VARCHAR`                  |
  | `z.iso.datetime()`, `zodCodecs.dateToString`                                                              | `TIMESTAMP`                |
  | `z.uuid()`, `z.uuidv7()`                                                                                  | `UUID`                     |
  | `z.boolean()`                                                                                             | `BOOLEAN`                  |
  | `z.int32()`                                                                                               | `INTEGER`                  |
  | `z.float32()`                                                                                             | `FLOAT`                    |
  | `z.float64()`                                                                                             | `DOUBLE`                   |
  | `z.number()`                                                                                              | inferred, default `BIGINT` |
  | `zodCodecs.bigintToString`                                                                                | `BIGINT`                   |

  ## Numeric inference
  - signed: `TINYINT` -> `SMALLINT` -> `INTEGER` -> `BIGINT` -> `HUGEINT`
  - unsigned: `UTINYINT` -> `USMALLINT` -> `UINTEGER` -> `UBIGINT` -> `UHUGEINT`
  - floats: `FLOAT` if float32 range, else `DOUBLE`

  ## Notes
  - nullable only affects `NOT NULL`
  - `meta({ primaryKey: true })` -> `PRIMARY KEY`
  - `z.number()` falls back to `BIGINT` without min/max
  - nested `z.object(...)` is not supported

## 0.8.3

### Patch Changes

- [#1028](https://github.com/belgattitude/flowblade/pull/1028) [`f5b5f2a`](https://github.com/belgattitude/flowblade/commit/f5b5f2a4a8070e6cf76ee8aa97af32308ad6f1e6) Thanks [@belgattitude](https://github.com/belgattitude)! - Update to duckdb node from 1.5.0-r.1 to 1.5.1-r.1

- Updated dependencies [[`f5b5f2a`](https://github.com/belgattitude/flowblade/commit/f5b5f2a4a8070e6cf76ee8aa97af32308ad6f1e6)]:
  - @flowblade/source-duckdb@0.20.1

## 0.8.2

### Patch Changes

- Updated dependencies [[`a3829ed`](https://github.com/belgattitude/flowblade/commit/a3829ed309881a4d501db2241a0bd7e74eb63790)]:
  - @flowblade/source-duckdb@0.20.0

## 0.8.1

### Patch Changes

- [#1018](https://github.com/belgattitude/flowblade/pull/1018) [`5889baa`](https://github.com/belgattitude/flowblade/commit/5889baa123a53dfd2a917ab4d70040726c32418b) Thanks [@belgattitude](https://github.com/belgattitude)! - Build with latest tsdown 0.21.1

- [#1018](https://github.com/belgattitude/flowblade/pull/1018) [`5889baa`](https://github.com/belgattitude/flowblade/commit/5889baa123a53dfd2a917ab4d70040726c32418b) Thanks [@belgattitude](https://github.com/belgattitude)! - Updated to duckdb 1.5.0

- Updated dependencies [[`5889baa`](https://github.com/belgattitude/flowblade/commit/5889baa123a53dfd2a917ab4d70040726c32418b), [`5889baa`](https://github.com/belgattitude/flowblade/commit/5889baa123a53dfd2a917ab4d70040726c32418b)]:
  - @flowblade/source-duckdb@0.19.0
  - @flowblade/sql-tag@0.3.2
  - @flowblade/core@0.2.26

## 0.8.0

### Minor Changes

- [#1010](https://github.com/belgattitude/flowblade/pull/1010) [`1417a54`](https://github.com/belgattitude/flowblade/commit/1417a545be43f704656906c884d748080704a2cb) Thanks [@belgattitude](https://github.com/belgattitude)! - Upgrade to duckdb 1.4.4-r.1

### Patch Changes

- Updated dependencies [[`1417a54`](https://github.com/belgattitude/flowblade/commit/1417a545be43f704656906c884d748080704a2cb)]:
  - @flowblade/source-duckdb@0.18.0

## 0.7.0

### Minor Changes

- [#1006](https://github.com/belgattitude/flowblade/pull/1006) [`8b605b9`](https://github.com/belgattitude/flowblade/commit/8b605b9bd1195c422ee9b1afa9b3c188b145c5fb) Thanks [@belgattitude](https://github.com/belgattitude)! - Expose DuckMemory helper

## 0.6.0

### Minor Changes

- [#1001](https://github.com/belgattitude/flowblade/pull/1001) [`1067e72`](https://github.com/belgattitude/flowblade/commit/1067e72ea26c4cc1e4268a160fbaee72fbb4b8b4) Thanks [@belgattitude](https://github.com/belgattitude)! - Rename rowsCount into totalRows in appended stats callback

- [#1001](https://github.com/belgattitude/flowblade/pull/1001) [`1067e72`](https://github.com/belgattitude/flowblade/commit/1067e72ea26c4cc1e4268a160fbaee72fbb4b8b4) Thanks [@belgattitude](https://github.com/belgattitude)! - Rename OnDataAppendedParams to OnDataAppendedStats

- [#1001](https://github.com/belgattitude/flowblade/pull/1001) [`1067e72`](https://github.com/belgattitude/flowblade/commit/1067e72ea26c4cc1e4268a160fbaee72fbb4b8b4) Thanks [@belgattitude](https://github.com/belgattitude)! - Export OnDataAppendedCb and OnDataAppendedParams types

### Patch Changes

- Updated dependencies [[`1067e72`](https://github.com/belgattitude/flowblade/commit/1067e72ea26c4cc1e4268a160fbaee72fbb4b8b4)]:
  - @flowblade/sql-tag@0.3.0
  - @flowblade/core@0.2.25
  - @flowblade/source-duckdb@0.17.3

## 0.5.0

### Minor Changes

- [#992](https://github.com/belgattitude/flowblade/pull/992) [`b907d5a`](https://github.com/belgattitude/flowblade/commit/b907d5ac3f76b41bd2ead570ffa40d4cfbf74ae3) Thanks [@belgattitude](https://github.com/belgattitude)! - Add statistics to OnDataAppended callback

## 0.4.0

### Minor Changes

- [#990](https://github.com/belgattitude/flowblade/pull/990) [`0dbc782`](https://github.com/belgattitude/flowblade/commit/0dbc782492fc5c637dd2071388cef071b283bb33) Thanks [@belgattitude](https://github.com/belgattitude)! - Add onDataAppended callbackand improve documentation

## 0.3.0

### Minor Changes

- [#986](https://github.com/belgattitude/flowblade/pull/986) [`bd06bef`](https://github.com/belgattitude/flowblade/commit/bd06befba52513723393188f3da7614890d7d560) Thanks [@belgattitude](https://github.com/belgattitude)! - Return createTableDDL to ease debugging

## 0.2.1

### Patch Changes

- [#984](https://github.com/belgattitude/flowblade/pull/984) [`f56bc3d`](https://github.com/belgattitude/flowblade/commit/f56bc3df11dbdee2b98aea1afc81e3fb16a04c15) Thanks [@belgattitude](https://github.com/belgattitude)! - Update duckdb neo to 1.4.3-r.3

- Updated dependencies [[`f56bc3d`](https://github.com/belgattitude/flowblade/commit/f56bc3df11dbdee2b98aea1afc81e3fb16a04c15)]:
  - @flowblade/source-duckdb@0.17.2

## 0.2.0

### Minor Changes

- [#982](https://github.com/belgattitude/flowblade/pull/982) [`e892dcb`](https://github.com/belgattitude/flowblade/commit/e892dcb42e6f54c8aa8bd8e39462ad9fe3a3e5bb) Thanks [@belgattitude](https://github.com/belgattitude)! - Include latest zod 3.4

## 0.1.0

### Minor Changes

- [#973](https://github.com/belgattitude/flowblade/pull/973) [`33c6eca`](https://github.com/belgattitude/flowblade/commit/33c6ecac7ea4b094ac27d55ea9a6704dbb5cf772) Thanks [@belgattitude](https://github.com/belgattitude)! - toTable now returns number of inserted rows and time in milliseconds

- [#973](https://github.com/belgattitude/flowblade/pull/973) [`33c6eca`](https://github.com/belgattitude/flowblade/commit/33c6ecac7ea4b094ac27d55ea9a6704dbb5cf772) Thanks [@belgattitude](https://github.com/belgattitude)! - Expose tableName, databaseName, schemaName from the Table object

- [#973](https://github.com/belgattitude/flowblade/pull/973) [`33c6eca`](https://github.com/belgattitude/flowblade/commit/33c6ecac7ea4b094ac27d55ea9a6704dbb5cf772) Thanks [@belgattitude](https://github.com/belgattitude)! - Rename getFullyQualifiedName into getFullName

### Patch Changes

- [#973](https://github.com/belgattitude/flowblade/pull/973) [`33c6eca`](https://github.com/belgattitude/flowblade/commit/33c6ecac7ea4b094ac27d55ea9a6704dbb5cf772) Thanks [@belgattitude](https://github.com/belgattitude)! - Test bigint types in e2e

## 0.0.6

### Patch Changes

- Updated dependencies [[`33641ee`](https://github.com/belgattitude/flowblade/commit/33641eea6b411d8e0b5650f4c3ddb28f3017a39a), [`d9403ae`](https://github.com/belgattitude/flowblade/commit/d9403ae24963728d7ecd8afe25e320c9a6eed074)]:
  - @flowblade/source-duckdb@0.17.0

## 0.0.5

### Patch Changes

- [`ffc7285`](https://github.com/belgattitude/flowblade/commit/ffc7285ba0addad8b1776d47e101fe42c1742d57) Thanks [@belgattitude](https://github.com/belgattitude)! - Update to duckdb/node-api 1.4.3-r.2

- Updated dependencies [[`ffc7285`](https://github.com/belgattitude/flowblade/commit/ffc7285ba0addad8b1776d47e101fe42c1742d57), [`ffc7285`](https://github.com/belgattitude/flowblade/commit/ffc7285ba0addad8b1776d47e101fe42c1742d57)]:
  - @flowblade/sql-tag@0.2.0
  - @flowblade/source-duckdb@0.16.3
  - @flowblade/core@0.2.24

## 0.0.4

### Patch Changes

- [#964](https://github.com/belgattitude/flowblade/pull/964) [`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8) Thanks [@belgattitude](https://github.com/belgattitude)! - Replace tsup by tsdown to build packages

- [#964](https://github.com/belgattitude/flowblade/pull/964) [`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8) Thanks [@belgattitude](https://github.com/belgattitude)! - Add bun support tests (unit & e2e)

- Updated dependencies [[`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8), [`9c51757`](https://github.com/belgattitude/flowblade/commit/9c51757e484cb90a375eda78808700457e4a9eb8)]:
  - @flowblade/source-duckdb@0.16.2
  - @flowblade/sql-tag@0.1.18
  - @flowblade/core@0.2.24

## 0.0.3

### Patch Changes

- [#955](https://github.com/belgattitude/flowblade/pull/955) [`f545f3d`](https://github.com/belgattitude/flowblade/commit/f545f3da9a6af966c38516507acea8144257d470) Thanks [@belgattitude](https://github.com/belgattitude)! - Github oidc publish

## 0.0.2

### Patch Changes

- [#953](https://github.com/belgattitude/flowblade/pull/953) [`d9d0022`](https://github.com/belgattitude/flowblade/commit/d9d00225697deda176e86a7323e7f17e9229c0c7) Thanks [@belgattitude](https://github.com/belgattitude)! - Publish experimental sqlduck on npm
