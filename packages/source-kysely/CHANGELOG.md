# @flowblade/source-kysely

## 0.13.7

### Patch Changes

- Updated dependencies [[`067a968`](https://github.com/belgattitude/flowblade/commit/067a968759302e5e5a70c45363754a77b1301f24)]:
  - @flowblade/sql-tag@0.1.7

## 0.13.6

### Patch Changes

- Updated dependencies [[`2c61d77`](https://github.com/belgattitude/flowblade/commit/2c61d77025259157fe2e4e4917f52682dcd578aa), [`0bcf17a`](https://github.com/belgattitude/flowblade/commit/0bcf17a9eff68ad6b6eebbbb6a36354ed3f5abe4)]:
  - @flowblade/sql-tag@0.1.6
  - @flowblade/core@0.2.5

## 0.13.5

### Patch Changes

- Updated dependencies [[`4099ebb`](https://github.com/belgattitude/flowblade/commit/4099ebb434deaa1094c27cda0247b35e2d5ee325)]:
  - @flowblade/sql-tag@0.1.5

## 0.13.4

### Patch Changes

- Updated dependencies [[`93f3cb0`](https://github.com/belgattitude/flowblade/commit/93f3cb07c44a37ce608720bd7dd28200a1e2d790)]:
  - @flowblade/core@0.2.4

## 0.13.3

### Patch Changes

- [#270](https://github.com/belgattitude/flowblade/pull/270) [`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79) Thanks [@belgattitude](https://github.com/belgattitude)! - Patch version but a lot of BC for datasource components

- Updated dependencies [[`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79)]:
  - @flowblade/sql-tag@0.1.4
  - @flowblade/core@0.2.3

## 0.13.2

### Patch Changes

- [#250](https://github.com/belgattitude/flowblade/pull/250) [`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix last release

- Updated dependencies [[`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16)]:
  - @flowblade/core@0.2.2

## 0.13.1

### Patch Changes

- [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb) - Republish

- Updated dependencies [[`1f9ad6c`](https://github.com/belgattitude/flowblade/commit/1f9ad6cb5ba87a4299066a41af383e74865c6a3b), [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb)]:
  - @flowblade/core@0.2.1

## 0.13.0

### Minor Changes

- [#237](https://github.com/belgattitude/flowblade/pull/237) [`7aaa524`](https://github.com/belgattitude/flowblade/commit/7aaa524be9981fbdcf153a3ae196754cde05c663) Thanks [@belgattitude](https://github.com/belgattitude)! - Create @flowblade/core package

  **Warning**: This is a breaking change

  Create `@flowblade/core` package to centralize common types and utilities. If you're relying
  on `@flowblade/source-kysely` or `@flowblade/source-duckdb`, you'll need to update your imports for
  `QueryResults` and others.

  ```typescript
  import type { QueryResult } from "@flowblade/core";
  import type { KyselyDatasource } from "@flowblade/source-kysely";
  ```

  And ensure that @flowblade/core is installed:

  ```bash
  yarn add @flowblade/core @flowblade/source-kysely kysely
  ```

## 0.12.0

### Minor Changes

- [#241](https://github.com/belgattitude/flowblade/pull/241) [`f7ab188`](https://github.com/belgattitude/flowblade/commit/f7ab1881c1c7fdc8571c96cf09c49ad9387ed8f9) Thanks [@belgattitude](https://github.com/belgattitude)! - Support new Kysely validateConnections and resetConnectionOnRelease options.

  **Warning this release contains a breaking change**

  - [x] Kysely minimum supported version is ^0.27.5.
  - [x] createKyselySqlServerDialect signature refactored

  ```typescript
  import { default as Tedious } from "tedious";
  import {
    TediousConnUtils,
    createKyselySqlServerDialect,
  } from "@flowblade/source-kysely";

  const jdbcDsn =
    "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
  const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

  const dialect = createKyselySqlServerDialect({
    tediousConfig,
    // 👉 Optional tarn pool options
    poolOptions: {
      min: 0, // Minimum number of connections, default 0
      max: 10, // Minimum number of connections, default 10
      validateConnections: true, // Revalidate new connections, default true
      propagateCreateError: false, // Exit immediately if true, default false
      log: (msg) => console.log(msg), // Custom logger, default noop
    },
    // 👉 Optional tarn pool options
    dialectConfig: {
      // 👉 Reset connection on pool release, default true
      resetConnectionOnRelease: true,
      // 👉 Example based on https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      tediousTypes: { ...Tedious.TYPES, NVarChar: Tedious.TYPES.VarChar },
    },
  });

  const db = new Kysely<DB>({
    dialect,
  });
  ```

## 0.11.0

### Minor Changes

- [#114](https://github.com/belgattitude/flowblade/pull/114) [`ed4c6bf`](https://github.com/belgattitude/flowblade/commit/ed4c6bf9b5997d497faa74ff584e971cf7829308) Thanks [@belgattitude](https://github.com/belgattitude)! - Expose InferQueryResultData and InferAsyncQueryResultData type helpers

## 0.10.0

### Minor Changes

- [#95](https://github.com/belgattitude/flowblade/pull/95) [`fc09914`](https://github.com/belgattitude/flowblade/commit/fc0991492a5a9d07d99aad24b1ee3d1f7c615c83) Thanks [@belgattitude](https://github.com/belgattitude)! - Add queryInfo metadata

## 0.9.0

### Minor Changes

- [#91](https://github.com/belgattitude/flowblade/pull/91) [`f5b2c01`](https://github.com/belgattitude/flowblade/commit/f5b2c01d15a13e042916404284c96a2705a8c545) Thanks [@belgattitude](https://github.com/belgattitude)! - Export convenience AsyncQueryResult type

## 0.8.0

### Minor Changes

- [#82](https://github.com/belgattitude/flowblade/pull/82) [`cb01bef`](https://github.com/belgattitude/flowblade/commit/cb01bef93a01a366ef4229bcc13f2091a7ea1586) Thanks [@belgattitude](https://github.com/belgattitude)! - Refactor! rename eb() to queryBuilder getter

## 0.7.0

### Minor Changes

- [#80](https://github.com/belgattitude/flowblade/pull/80) [`f7efa65`](https://github.com/belgattitude/flowblade/commit/f7efa65382e1b1a1642582f0c31145806d905282) Thanks [@belgattitude](https://github.com/belgattitude)! - query and queryRaw don't throw, but return a QueryResutError

## 0.6.1

### Patch Changes

- [`d0590da`](https://github.com/belgattitude/flowblade/commit/d0590dac858757b8479371ff6c8af131acdbfcc7) Thanks [@belgattitude](https://github.com/belgattitude)! - Make DatasourceResult.meta optional

## 0.6.0

### Minor Changes

- [#77](https://github.com/belgattitude/flowblade/pull/77) [`905c549`](https://github.com/belgattitude/flowblade/commit/905c5495e20ceee3121b64e820c9185719978406) Thanks [@belgattitude](https://github.com/belgattitude)! - Export DatasourceResult type

## 0.5.0

### Minor Changes

- [#74](https://github.com/belgattitude/flowblade/pull/74) [`751aec1`](https://github.com/belgattitude/flowblade/commit/751aec1ab2801815a05ff778eea79e952214da89) Thanks [@belgattitude](https://github.com/belgattitude)! - Refactor!: rename createKyselyMssqlDialect into createKyselySqlServerDialect

- [#72](https://github.com/belgattitude/flowblade/pull/72) [`07babdd`](https://github.com/belgattitude/flowblade/commit/07babddf52d186c9994731835d038615e338d657) Thanks [@belgattitude](https://github.com/belgattitude)! - Expose kysely expression builder 'KyselyDatasource.eb()'

- [#72](https://github.com/belgattitude/flowblade/pull/72) [`07babdd`](https://github.com/belgattitude/flowblade/commit/07babddf52d186c9994731835d038615e338d657) Thanks [@belgattitude](https://github.com/belgattitude)! - Improve error, add Error.cause

## 0.4.0

### Minor Changes

- [#69](https://github.com/belgattitude/flowblade/pull/69) [`40b1eba`](https://github.com/belgattitude/flowblade/commit/40b1eba863dd12b7c9c4187b658b9d4158589451) Thanks [@belgattitude](https://github.com/belgattitude)! - Improve e2e test to run on sql-server

## 0.3.0

### Minor Changes

- [`6967b73`](https://github.com/belgattitude/flowblade/commit/6967b73057c2f7297377951c5bebd9fbcac93115) - BC: rename executor into datasource + expose underlying connection

## 0.2.0

### Minor Changes

- [`e1b1753`](https://github.com/belgattitude/flowblade/commit/e1b1753100361d67995f73abf4cb3faeddaccb46) - Add queryRaw to KyselyExecutor

## 0.1.0

### Minor Changes

- [#63](https://github.com/belgattitude/flowblade/pull/63) [`0cccb60`](https://github.com/belgattitude/flowblade/commit/0cccb602d81f47a2827b8a3461a798f7f3ec38e8) Thanks [@belgattitude](https://github.com/belgattitude)! - Add tediousTypes param for createKyselyDialect

## 0.0.2

### Patch Changes

- [#61](https://github.com/belgattitude/flowblade/pull/61) [`0c93ad0`](https://github.com/belgattitude/flowblade/commit/0c93ad0c8d7711432937446fe76012fa8413527e) Thanks [@belgattitude](https://github.com/belgattitude)! - Stabilize TediousConnUtils and createKyselyMssqlDialect
