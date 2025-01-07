# @flowblade/source-duckdb

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
