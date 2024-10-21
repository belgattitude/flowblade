# @flowblade/source-kysely

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
