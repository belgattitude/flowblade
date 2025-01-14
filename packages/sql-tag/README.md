# @flowblade/sql-tag

Fast and lightweight ([~630B](#bundle-size)) sql template tag based on [sql-template-tag](https://github.com/blakeembrey/sql-template-tag).

[![npm](https://img.shields.io/npm/v/@flowblade/sql-tag?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/sql-tag)
[![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag/CHANGELOG.md)
[![codecov](https://img.shields.io/codecov/c/github/belgattitude/flowblade?logo=codecov&label=Unit&flag=flowblade-sql-tag-unit&style=for-the-badge&labelColor=444)](https://app.codecov.io/gh/belgattitude/flowblade/tree/main/packages%2Fsql-tag)
[![bundles](https://img.shields.io/static/v1?label=&message=cjs|esm@treeshake&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag/.size-limit.cjs)
[![node](https://img.shields.io/static/v1?label=Node&message=18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![browserslist](https://img.shields.io/static/v1?label=Browser&message=%3E96%25&logo=googlechrome&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![size](https://img.shields.io/bundlephobia/minzip/@flowblade/sql-tag@latest?label=Max&style=for-the-badge&labelColor=444&color=informational)](https://bundlephobia.com/package/@flowblade/sql-tag@latest)
[![downloads](https://img.shields.io/npm/dm/@flowblade/sql-tag?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/sql-tag)
[![license](https://img.shields.io/npm/l/@flowblade/sql-tag?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

## Features

- 🛡️&nbsp; Take advantage of [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to prevent sql injections.
- 🤲&nbsp; Facilitate [query composition](#query-composition) and [conditional clauses](#conditionals).
- 🦄&nbsp; Separate actual sql from provided parameters.
- ⚡️&nbsp; Minimal performance overhead.
- 📐&nbsp; Lightweight (less than [~700B](#bundle-size))
- ♾️️&nbsp; Tested on [node 18-22, browser, workers and edge](#compatibility).
- 🌍 &nbsp; Available in ESM and CJS formats.

## Install

```bash
yarn add @flowblade/sql-tag
```
## Usage

### Basic

```typescript
import { sql } from '@flowblade/sql-tag';

// 👈 User provided parameters
const params = {
    country: 'BE',
    users: ['John', 'Doe'],
};

const query = sql<{ // 👈 optionally type the result
    id: number;
    username: string;
}>`
   SELECT id, username FROM users 
   WHERE country = ${params.country}           -- 👈 simple param
   AND username IN (${sql.join(params.users)}) -- 👈 array param
`;

// query.sql === "SELECT id, username FROM users WHERE country = ? AND username IN (?, ?)";
// query.values === ['BE', 'John', 'Doe'];
```

### Conditionals

```typescript
import { sql } from '@flowblade/sql-tag';

// 👈 User provided parameters
const userIds = [1, 2];
const limit = 10;

const query = sql<{ // 👈 optionally type the result
    id: number;
    username: string;
}>`
   SELECT id, username FROM users 
   WHERE 1=1 
   -- 👇 alternative 2: with ternary operator and sql.empty
   ${userIds.length > 0 ? sql`AND id IN (${sql.join(userIds)})` : sql.empty}
   
   -- 👇 alternative 2: with usage of sql.if helper
   ${sql.if(
     userIds.length,
     () => sql`AND id IN (${sql.join(userIds)})`
   )}    
   LIMIT ${limit}                 
`;

// query.sql === "SELECT id, username FROM users WHERE 1=1 AND id IN (?, ?) LIMIT ?";
// query.values === [1, 2, 10];
```


### Query composition

You can nest any query into another one.

```typescript
import {sql} from '@flowblade/sql-tag';

const getSqlUserCountByCountries = (minUsers: number) => sql`
  SELECT 
    c.name as country_name, 
    count(u.id) as user_count 
  FROM country AS c INNER JOIN user u 
  ON c.id = u.country_id
  GROUP BY c.name
  HAVING count(u.id) > ${minUsers}
`;

const compression: 'zstd' | 'snappy' | 'gzip' = 'zstd';

// Example base on DuckDb COPY statement
// but you can nest into CTE, table aliases, subqueries etc...
const query = sql`
    COPY
    (${getSqlUserCountByCountries(23)})
    TO 'usercount_by_countries.parquet'
    (FORMAT 'parquet', COMPRESSION ${compression}, ROW_GROUP_SIZE 100000);
`;

console.log(query.values); // [23, 'zstd']
console.log(query.sql);    // "COPY (SELECT...."
```

### Bulk inserts

Ease bulk inserts/merge from multi rows arrays.

```typescript
import { sql } from '@flowblade/sql-tag';

const insert = sql`
   INSERT INTO product (name, price, stock, status) 
   VALUES ${sql.bulk([
     ['Laptop', 999.99, 50, 'active'],
     ['Keyboard', 79.99, 100, 'active'],
   ])}
  `;

const { text, sql, statement, values } = insert;

insert.text;   //=> "INSERT INTO product (name, price, stock, status) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)"
insert.sql;    //=> "INSERT INTO product (name, price, stock, status) VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?)"
insert.values; //=> ["Laptop", 999.99, 50, "active", "Keyboard", 79.99, 100, "active"]
```

// Example with pglite
const result = await db.query(text, values, {});
```

## Methods

| Helpers       | Description                               | Example                                              |
|---------------|-------------------------------------------|------------------------------------------------------|
| sql.unsafeRaw | Allow to pass unsafe values in the query. | `ORDER BY ${sql.unsafeRaw('name desc')}`             |
| sql.empty     | Helper to represent empty string.         | `${isTrue ? sql'1=1' : sql.empty}`                   |
| sql.join      | Join array values with optional separator | `AND id IN ${sql.join(['1', '3'])`                   |
| sql.if        | Conditionally add a statement             | `AND ${sql.if(true, () => sql'deleted_at is null')}` |
| sql.bulk      | Ease bulk inserts                         |                                                      |

## Recipes

### Advanced examplew with transact-sql (mssql)

```typescript
const products = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  productName: `Product ${i}`,
}));

const sqlRaw = sql<GetAdvancedResult>`
  -- TRANSACT-SQL
  DECLARE @Products NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
  SET @Products = ${JSON.stringify(products)};

  -- DDL (# prefix is equivalent to CREATE TEMPORATY TABLE on other db)
  CREATE TABLE #products (
    productId INT,
    name NVARCHAR(255),
  );
  
  -- INSERT
  INSERT INTO #products (productId, productName)
     SELECT productId, productName
       FROM OPENJSON(@InitialData) WITH (
           id INT,           
           name NVARCHAR(255)
       );
          
  -- SELECT
  SELECT TOP ${sql.unsafeRaw(String(limit))} id, name
    FROM #products
    WHERE id > ${sql.unsafeRaw(String(offset))}
    ORDER BY id; 
`;

```

## Credits

This package won't be possible without the great work of [Blake Embrey sql-template-tag](https://github.com/blakeembrey/sql-template-tag).

Some notable differences:

- [x] Named export for sql: `import {sql} from '@flowblade/sql-tag'`.
- [x] Possibility to type the result of the query (ie `sql<Row>`).
- [x] Utility functions (join...) are directly available from the sql tag.
- [x] Add `sql.if` helper to conditionally add a statement.
- [x] Rename `sqlRaw` to `sql.unsafeRaw` to prevent misuse.

## Bundle size

Bundle size is tracked by a [size-limit configuration](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag/.size-limit.ts)

| Scenario (esm)                                              | Size (compressed) |
|-------------------------------------------------------------|------------------:|
| `import { sql } from '@flowblade/sql-tag`                   |            ~ 630B |

## Compatibility

| Level      | CI | Description                                                                                                                                                                                                                                                                                                                                    |
|------------|----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|  
| Node       | ✅  | CI for 18.x, 20.x & 22.x.                                                                                                                                                                                                                                                                                                                      |
| Browser    | ✅  | Tested with latest chrome (vitest/playwright)                                                                                                                                                                                                                                                                                            |
| Browsers   | ✅  | [> 96%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NixmaXJlZm94ID49IDkwLGVkZ2UgPj0gMTksc2FmYXJpID49IDEyLGlvcyA%2BPSAxMixvcGVyYSA%2BPSA3Nw%3D%3D) on 07/2024. Mins to [Chrome 96+, Firefox 90+, Edge 19+, iOS 12+, Safari 12+, Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag/.browserslistrc) |
| Edge       | ✅  | Ensured on CI with [@vercel/edge-runtime](https://github.com/vercel/edge-runtime).                                                                                                                                                                                                                                                       | 
| Cloudflare | ✅  | Ensured with @cloudflare/vitest-pool-workers (see [wrangler.toml](https://github.com/belgattitude/flowblade/blob/main/devtools/vitest/wrangler.toml)                                                                                                                                                                                         |
| Typescript | ✅  | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI.                                                                                                                                                                                                                                  |
| ES2022     | ✅  | Dist files checked with [es-check](https://github.com/yowainwright/es-check)                                                                                                                                                                                                                                                                   |
| Performance| ✅  | Monitored with [codspeed.io](https://codspeed.io/belgattitude/flowblade)                                                                                                                                                                                                                                                                      |

## Contributors

Contributions are welcome. Have a look to the [CONTRIBUTING](https://github.com/belgattitude/flowblade/blob/main/CONTRIBUTING.md) document.

## Sponsors

[Sponsor](<[sponsorship](https://github.com/sponsors/belgattitude)>), [coffee](<(https://ko-fi.com/belgattitude)>),
or star – All is spent for quality time with loved ones. Thanks ! 🙏❤️

### Special thanks to

<table>
  <tr>
    <td>
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">
         <img width="65" src="https://asset.brandfetch.io/idarKiKkI-/id53SttZhi.jpeg" alt="Jetbrains logo" />
      </a>
    </td>
    <td>
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">
        <img width="65" src="https://avatars.githubusercontent.com/u/98402122?s=200&v=4" alt="Jetbrains logo" />    
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">JetBrains</a>
    </td>
    <td align="center">
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">Embie.be</a>
    </td>
   </tr>
</table>

## License

MIT © [Sébastien Vanvelthem](https://github.com/belgattitude) and contributors.
