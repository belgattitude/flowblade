# @flowblade/source-kysely

A source adapter for [Kysely](https://github.com/kysely-org/kysely).

[![npm](https://img.shields.io/npm/v/@flowblade/source-kysely?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-kysely)
[![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/CHANGELOG.md)
[![codecov](https://img.shields.io/codecov/c/github/belgattitude/flowblade?logo=codecov&label=Unit&flag=flowblade-source-kysely-unit&style=for-the-badge&labelColor=444)](https://app.codecov.io/gh/belgattitude/flowblade/tree/main/packages%2Fsource-kysely)
[![bundles](https://img.shields.io/static/v1?label=&message=cjs|esm@treeshake&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.size-limit.cjs)
[![node](https://img.shields.io/static/v1?label=Node&message=20%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![browserslist](https://img.shields.io/static/v1?label=Browser&message=%3E96%25&logo=googlechrome&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![size](https://img.shields.io/bundlephobia/minzip/@flowblade/source-kysely@latest?label=Max&style=for-the-badge&labelColor=444&color=informational)](https://bundlephobia.com/package/@flowblade/source-kysely@latest)
[![downloads](https://img.shields.io/npm/dm/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-kysely)
[![license](https://img.shields.io/npm/l/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

## Install

```bash
yarn add @flowblade/source-kysely kysely

# Install optional drivers
# 01. for Ms SqlServer or Azure Sql Edge
yarn add tedious tarn
```

Kysely supports

[![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=flat&logo=postgresql&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=postgresql)
[![MySQL](https://img.shields.io/badge/mysql-4479A1.svg?style=flat&logo=mysql&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=mysql)
[![MicrosoftSQLServer](https://img.shields.io/badge/Microsoft%20SQL%20Server-CC2927?style=flat&logo=microsoft%20sql%20server&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=mssql)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=flat&logo=sqlite&logoColor=white)](https://kysely.dev/docs/getting-started?dialect=sqlite)

## Quick start

```typescript
// Your db configuration, see Utils section for more details
import { db } from "@/config/db.config.ts";
import { KyselyDatasource, isQueryResultError } from "@flowblade/source-kysely";
import { sql } from "kysely";

import { KyselyDatasource, isQueryResultError } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"])
  .leftJoin("product as p", "p.brand_id", "b.id")
  .select(["p.id as product_id", "p.name as product_name"])
  .where("b.created_at", "<", new Date())
  .orderBy("b.name", "desc");

const result = await ds.query(query);

// Or with query information (will be sent in the metadata)
// const result = await ds.query(query, {
//  name: 'getBrands'
// });

// Option 1: the QResult object contains the data, metadata and error
//  - data:  the result rows (TData or undefined if error)
//  - error: the error (QError or undefined if success)
//  - meta:  the metadata (always present)

const { data, meta, error } = result;

// Option 2: You operate over the result, ie: mapping the data

const { data: data2 } = result.map((row) => {
  return {
    ...data,
    key: `key-${row.productId}`,
  };
});
```

### Streaming

```typescript
import { KyselyDatasource } from "@flowblade/source-kysely";

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder // This gives access to Kysely expression builder
  .selectFrom("brand as b")
  .select(["b.id", "b.name"]);

const stream = ds.stream(query, {
  // Chunksize used when reading the database
  // @default undefined
  chunkSize: undefined,
});

for await (const brand of stream) {
  console.log(brand.name);
  if (brand.name === "Something") {
    // Breaking or returning before the stream has ended will release
    // the database connection and invalidate the stream.
    break;
  }
}
```

## Utils

### createKyselyMssqlDialect

Create a Kysely dialect for Ms SqlServer or Azure Sql Edge.

```typescript
import * as Tedious from "tedious";
import {
  TediousConnUtils,
  createKyselyMssqlDialect,
} from "@flowblade/source-kysely";

const jdbcDsn =
  "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

const dialect = createKyselyMssqlDialect({
  tediousConfig,
  // 👉 Optional tarn pool options
  poolOptions: {
    min: 0, // 👉 Minimum number of connections, default 0
    max: 10, // 👉 Maximum number of connections, default 10
    propagateCreateError: true, // 👉 Propagate connection creation errors, default false
  },
  dialectConfig: {
    /**
     * When true, connections are validated before being acquired from the pool,
     * resulting in additional requests to the database.
     *
     * In safe scenarios, this can be set to false to improve performance.
     *
     * Defaults to `true`.
     */
    validateConnections: true,
    /**
     * When true, connections are reset to their initial states when released back to the pool,
     * resulting in additional requests to the database.
     *
     * Defaults to `false`.
     */
    resetConnectionsOnRelease: false,
    // 👉 Override Tedious types to enhance compatibility and modern support
    tediousTypes: {
      ...Tedious.TYPES,
      // see https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      NVarChar: Tedious.TYPES.VarChar,
      // see https://github.com/kysely-org/kysely/issues/1596#issuecomment-3341591075
      DateTime: Tedious.TYPES.DateTime2,
    },
  },
});

const db = new Kysely<DB>({
  dialect,
});
```

> **Note**: For performance you can avoid connection roundtrips by setting `validateConnections` to `false`
> and `resetConnectionOnRelease` to `false`.

### TediousConnUtils

#### fromJdbcDsn

Parse and validate a JDBC connection string and return a Tedious connection configuration.

```typescript
import * as Tedious from "tedious";
import { TediousConnUtils } from "@flowblade/source-kysely";

// In your .env file
// DB_JDBC_DSN="sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";

const tediousConfig = TediousConnUtils.fromJdbcDsn(process.env.DB_JDBC_DSN);

const tediousConnection = new Tedious.Connection(tediousConfig);
```

## Compatibility

| Level        | CI  | Description                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node         | ✅  | CI for 20.x, 22.x. & 24.x                                                                                                                                                                                                                                                                                                                                              |
| Cloudflare   | ✅  | Ensured with @cloudflare/vitest-pool-workers (see [wrangler.toml](https://github.com/belgattitude/flowblade/blob/main/devtools/vitest/wrangler.toml)                                                                                                                                                                                                                   |
| Browserslist | ✅  | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.browserslistrc) |
| Typescript   | ✅  | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI.                                                                                                                                                                                                                                                          |
| ES2022       | ✅  | Dist files checked with [es-check](https://github.com/yowainwright/es-check)                                                                                                                                                                                                                                                                                           |
| Performance  | ✅  | Monitored with [codspeed.io](https://codspeed.io/belgattitude/flowblade)                                                                                                                                                                                                                                                                                               |

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
