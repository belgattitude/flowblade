# @flowblade/source-duckdb

## 0.1.10

### Patch Changes

- Updated dependencies [[`1a5cf14`](https://github.com/belgattitude/flowblade/commit/1a5cf14e3db80e086301cf588c5c49a3076ec8af), [`1a5cf14`](https://github.com/belgattitude/flowblade/commit/1a5cf14e3db80e086301cf588c5c49a3076ec8af)]:
  - @flowblade/core@0.2.6

## 0.1.9

### Patch Changes

- [#307](https://github.com/belgattitude/flowblade/pull/307) [`ff2d08e`](https://github.com/belgattitude/flowblade/commit/ff2d08e651bfc741e51929b3f7f5cbb99a134a41) Thanks [@belgattitude](https://github.com/belgattitude)! - Breaking: replace duckdb-async driver by @duckdb/node-api alpha

## 0.1.8

### Patch Changes

- Updated dependencies [[`067a968`](https://github.com/belgattitude/flowblade/commit/067a968759302e5e5a70c45363754a77b1301f24)]:
  - @flowblade/sql-tag@0.1.7

## 0.1.7

### Patch Changes

- Updated dependencies [[`2c61d77`](https://github.com/belgattitude/flowblade/commit/2c61d77025259157fe2e4e4917f52682dcd578aa), [`0bcf17a`](https://github.com/belgattitude/flowblade/commit/0bcf17a9eff68ad6b6eebbbb6a36354ed3f5abe4)]:
  - @flowblade/sql-tag@0.1.6
  - @flowblade/core@0.2.5

## 0.1.6

### Patch Changes

- Updated dependencies [[`4099ebb`](https://github.com/belgattitude/flowblade/commit/4099ebb434deaa1094c27cda0247b35e2d5ee325)]:
  - @flowblade/sql-tag@0.1.5

## 0.1.5

### Patch Changes

- Updated dependencies [[`93f3cb0`](https://github.com/belgattitude/flowblade/commit/93f3cb07c44a37ce608720bd7dd28200a1e2d790)]:
  - @flowblade/core@0.2.4

## 0.1.4

### Patch Changes

- [#270](https://github.com/belgattitude/flowblade/pull/270) [`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79) Thanks [@belgattitude](https://github.com/belgattitude)! - Patch version but a lot of BC for datasource components

- Updated dependencies [[`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79)]:
  - @flowblade/sql-tag@0.1.4
  - @flowblade/core@0.2.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`493e1e8`](https://github.com/belgattitude/flowblade/commit/493e1e808b8435b7dbfa8ebc2a37d95d91710925)]:
  - @flowblade/sql-tag@0.1.3

## 0.1.2

### Patch Changes

- [#250](https://github.com/belgattitude/flowblade/pull/250) [`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix last release

- Updated dependencies [[`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16)]:
  - @flowblade/core@0.2.2
  - @flowblade/sql-tag@0.1.2

## 0.1.1

### Patch Changes

- [#244](https://github.com/belgattitude/flowblade/pull/244) [`1f9ad6c`](https://github.com/belgattitude/flowblade/commit/1f9ad6cb5ba87a4299066a41af383e74865c6a3b) Thanks [@belgattitude](https://github.com/belgattitude)! - Initial alpha version for source duckdb

- [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb) - Republish

- Updated dependencies [[`1f9ad6c`](https://github.com/belgattitude/flowblade/commit/1f9ad6cb5ba87a4299066a41af383e74865c6a3b), [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb)]:
  - @flowblade/core@0.2.1
  - @flowblade/sql-tag@0.1.1

## 1.0.0

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

- [#237](https://github.com/belgattitude/flowblade/pull/237) [`e35801e`](https://github.com/belgattitude/flowblade/commit/e35801e0b7b36721dc70882c4da822a7a44b3836) Thanks [@belgattitude](https://github.com/belgattitude)! - Initial alpha release of @flowblade/source-duckdb

### Patch Changes

- Updated dependencies [[`d39d89c`](https://github.com/belgattitude/flowblade/commit/d39d89c88586fade87037081fa14d70e087b4017)]:
  - @flowblade/sql-tag@0.1.0
