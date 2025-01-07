# @flowblade/sql-tag

## 0.1.3

### Patch Changes

- [#262](https://github.com/belgattitude/flowblade/pull/262) [`493e1e8`](https://github.com/belgattitude/flowblade/commit/493e1e808b8435b7dbfa8ebc2a37d95d91710925) Thanks [@belgattitude](https://github.com/belgattitude)! - Rename TaggedSql type to SqlTag

## 0.1.2

### Patch Changes

- [#250](https://github.com/belgattitude/flowblade/pull/250) [`bbacdbf`](https://github.com/belgattitude/flowblade/commit/bbacdbff458c079df721db6241c3ff042c1c0e16) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix last release

## 0.1.1

### Patch Changes

- [`546c69f`](https://github.com/belgattitude/flowblade/commit/546c69f7d52aa28ca0386b8076abc4ddd531afbb) - Republish

## 0.1.0

### Minor Changes

- [#237](https://github.com/belgattitude/flowblade/pull/237) [`d39d89c`](https://github.com/belgattitude/flowblade/commit/d39d89c88586fade87037081fa14d70e087b4017) Thanks [@belgattitude](https://github.com/belgattitude)! - Initial @flowblade/sql-tag release

  ## Install

  ```bash
  yarn add @flowblade/sql-tag
  ```

  ## Usage

  ```typescript
  import { sql } from "@flowblade/sql-tag";

  // 👈 Unvalidated parameters
  const params = {
    country: "BE",
    users: ["John", "Doe"],
    ids: [1],
  };

  const query = sql<{
    id: number;
    username: string;
  }>`
     SELECT id, username FROM users
     WHERE country = ${params.country}           -- 👈 simple
     AND username IN (${sql.join(params.users)}) -- 👈 sql.join
  
     -- 👇 conditional clause with sql.empty
     ${params.ids.length > 0 ? sql`AND id IN (${sql.join(params.ids)})` : sql.empty}
  `;

  // query.sql === "SELECT id, username FROM users WHERE country = ? AND username IN (?, ?) AND id IN (?)";
  // query.values === ['BE', 'John', 'Doe', 1];
  ```
