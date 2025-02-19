# @flowblade/sql-tag

## 0.1.10

### Patch Changes

- [#418](https://github.com/belgattitude/flowblade/pull/418) [`9b02388`](https://github.com/belgattitude/flowblade/commit/9b023886645a2f8ba86f1b90f21eaae46c54fb15) Thanks [@belgattitude](https://github.com/belgattitude)! - Internal declare external on sql-template-tag

## 0.1.9

### Patch Changes

- [#337](https://github.com/belgattitude/flowblade/pull/337) [`a4c0261`](https://github.com/belgattitude/flowblade/commit/a4c02616b082b244fc095ff97086a40f15545019) Thanks [@belgattitude](https://github.com/belgattitude)! - Update browserslist baseline

## 0.1.8

### Patch Changes

- [#328](https://github.com/belgattitude/flowblade/pull/328) [`485d95e`](https://github.com/belgattitude/flowblade/commit/485d95ee70b6af2a9ce32ee42420cd1cf8fbdd19) Thanks [@belgattitude](https://github.com/belgattitude)! - Update browserslist minimums

  ```
  defaults
  chrome >= 96
  firefox >= 94
  edge >= 91
  safari >= 15
  ios >= 15
  opera >= 83
  ```

## 0.1.7

### Patch Changes

- [#282](https://github.com/belgattitude/flowblade/pull/282) [`067a968`](https://github.com/belgattitude/flowblade/commit/067a968759302e5e5a70c45363754a77b1301f24) Thanks [@belgattitude](https://github.com/belgattitude)! - Fix jsdoc and add bulk insert example

## 0.1.6

### Patch Changes

- [#279](https://github.com/belgattitude/flowblade/pull/279) [`2c61d77`](https://github.com/belgattitude/flowblade/commit/2c61d77025259157fe2e4e4917f52682dcd578aa) Thanks [@belgattitude](https://github.com/belgattitude)! - - Improve README with recipes for conditionals and query composition

  - Add `sql.if` helper for alternative conditional syntax.

  ```typescript
  import { sql } from "@flowblade/sql-tag";

  // 👈 User provided parameters
  const userIds = [1, 2];

  const query = sql<{
    // 👈 optionally type the result
    id: number;
    username: string;
  }>`
     SELECT id, username FROM users
     WHERE 1=1
     -- 👇 alternative 2: with ternary operator and sql.empty
     ${userIds.length > 0 ? sql`AND id IN (${sql.join(userIds)})` : sql.empty}
  
     -- 👇 alternative 2: with usage of sql.if helper
     ${sql.if(userIds.length, () => sql`AND id IN (${sql.join(userIds)})`)}
  `;

  // query.sql === "SELECT id, username FROM users WHERE 1=1 AND id IN (?, ?)";
  // query.values === [1, 2];
  ```

## 0.1.5

### Patch Changes

- [`4099ebb`](https://github.com/belgattitude/flowblade/commit/4099ebb434deaa1094c27cda0247b35e2d5ee325) - Improve documentation

## 0.1.4

### Patch Changes

- [#270](https://github.com/belgattitude/flowblade/pull/270) [`389491e`](https://github.com/belgattitude/flowblade/commit/389491e37a918d441ac574aac3ebb0700ba02d79) Thanks [@belgattitude](https://github.com/belgattitude)! - Patch version but a lot of BC for datasource components

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
