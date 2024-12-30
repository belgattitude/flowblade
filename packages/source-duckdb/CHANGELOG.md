# @flowblade/source-duckdb

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
