# @flowblade/source-kysely

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
