# @flowblade/sql-tag-format

Sql formatter utilities for [@flowblade/sql-tag](https://github.com/belgattitude/flowblade/tree/main/packages/sql-tag#readme)

[![npm](https://img.shields.io/npm/v/@flowblade/sql-tag-format?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/sql-tag-format)
[![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag-format/CHANGELOG.md)
[![codecov](https://img.shields.io/codecov/c/github/belgattitude/flowblade?logo=codecov&label=Unit&flag=flowblade-sql-tag-format-unit&style=for-the-badge&labelColor=444)](https://app.codecov.io/gh/belgattitude/flowblade/tree/main/packages%2Fsql-tag-format)
[![bundles](https://img.shields.io/static/v1?label=&message=cjs|esm@treeshake&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag-format/.size-limit.cjs)
[![node](https://img.shields.io/static/v1?label=Node&message=18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![browserslist](https://img.shields.io/static/v1?label=Browser&message=%3E96%25&logo=googlechrome&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![size](https://img.shields.io/bundlephobia/minzip/@flowblade/sql-tag-format@latest?label=Max&style=for-the-badge&labelColor=444&color=informational)](https://bundlephobia.com/package/@flowblade/sql-tag-format@latest)
[![downloads](https://img.shields.io/npm/dm/@flowblade/sql-tag-format?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/sql-tag-format)
[![license](https://img.shields.io/npm/l/@flowblade/sql-tag-format?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

## Features

- 🛡️&nbsp; Tested on [node 18-22, browser, cloudflare workers and runtime/edge](#compatibility).
- 🗝️&nbsp; Available in ESM and CJS formats.

## Install

```bash
yarn add @flowblade/sql-tag-format @flowblade/sql-tag
```
## Usage

```typescript
import {sql} from '@flowblade/sql-tag';
import {SqlFormatter} from "@flowblade/sql-tag-format";

// 👈 Unvalidated parameters
const params = {
    country: 'BE',
    users: ['John', 'Doe'],
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

const pgsqlFormatter = new SqlFormatter('postgresql');

const formatted = pgsqlFormatter.formatOrNull(query);

try {
    const formatted = pgsqlFormatter.formatOrThrow(query);
} catch (e) {
    console.error(e);
}
```

## Supported dialects

| Dialect      | Description                  |
|---------------|------------------------------|
| bigquery      | Google SQL                   |
| db2           | DB2 SQL                      |
| db2i          | DB2 iSeries SQL              |
| hive          | HiveQL                       |
| mariadb       | MariaDB SQL                  |
| mysql         | MySQL SQL                    |
| n1ql          | N1QL                         |
| plsql         | PL/SQL                       |
| postgresql    | PostgreSQL SQL               |
| redshift      | Redshift SQL                 |
| singlestoredb | SingleStore SQL              |
| snowflake     | Snowflake SQL                |
| spark         | Spark SQL                    |
| sql           | ANSI SQL                     |
| sqlite        | SQLite SQL                   |
| tidb          | TiDB SQL                     |
| transactsql   | Mssql / Transact-SQL (T-SQL) |
| trino         | Trino SQL                    |
| tsql          | Transact-SQL                 |

## Bundle size

Bundle size is tracked by a [size-limit configuration](https://github.com/belgattitude/flowblade/blob/main/packages/sql-tag/.size-limit.ts)

| Scenario (esm)                                            | Size (compressed) |
|-----------------------------------------------------------|------------------:|
| `import { SqlFormatter } from '@flowblade/sql-tag-format` |            ~ 47Kb |

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
