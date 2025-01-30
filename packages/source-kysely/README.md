# @flowblade/source-kysely

[![npm](https://img.shields.io/npm/v/@flowblade/source-kysely?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-kysely)
[![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/CHANGELOG.md)
[![codecov](https://img.shields.io/codecov/c/github/belgattitude/flowblade?logo=codecov&label=Unit&flag=flowblade-source-kysely-unit&style=for-the-badge&labelColor=444)](https://app.codecov.io/gh/belgattitude/flowblade/tree/main/packages%2Fsource-kysely)
[![bundles](https://img.shields.io/static/v1?label=&message=cjs|esm@treeshake&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.size-limit.cjs)
[![node](https://img.shields.io/static/v1?label=Node&message=18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![browserslist](https://img.shields.io/static/v1?label=Browser&message=%3E96%25&logo=googlechrome&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![size](https://img.shields.io/bundlephobia/minzip/@flowblade/source-kysely@latest?label=Max&style=for-the-badge&labelColor=444&color=informational)](https://bundlephobia.com/package/@flowblade/source-kysely@latest)
[![downloads](https://img.shields.io/npm/dm/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-kysely)
[![license](https://img.shields.io/npm/l/@flowblade/source-kysely?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)


## Install

```bash
yarn add @flowblade/core @flowblade/source-kysely kysely

# Install optional drivers
# 01. for Ms SqlServer or Azure Sql Edge
yarn add tedious tarn
```

## Quick start

```typescript
// Your db configuration, see Utils section for more details
import { db } from '@/config/db.config.ts'; 
import { KyselyDatasource, isQueryResultError } from '@flowblade/source-kysely';
import { sql } from 'kysely'; 

const ds = new KyselyDatasource({ db });
const query = ds.queryBuilder  // Kysely expression builder
        .selectFrom('brand as b')
        .select(['b.id', 'b.name'])
        .leftJoin('product as p', 'p.brand_id', 'b.id')
        .select(['p.id as product_id', 'p.name as product_name'])
        .where('b.created_at', '<', new Date())
        .orderBy('b.name', 'desc');

const result = await ds.query(query);

// Or with query information (will be sent in the metadata)
// const result = await ds.query(query, {
//  name: 'getBrands'
// });

// Discriminated usin with success: true | false
if (isQueryResultError(result)) {
    console.error(result.error);
    console.error(result.meta);
}  else {
    console.log(result.data);
    console.log(result.meta);
}

/** Raw queries support */
const data = await ds.queryRaw(sql<{ count: number }>`SELECT 1 as "count' FROM brand`);
```

## Type helpers

### InferQueryResultData

Infer the success part (data) of a QueryResult.

```typescript
import type { InferQueryResultData, QueryResult } from "@flowblade/source-kysely";

type Row = { id: number };
const queryResult: QueryResult<Row[]> = {
  success: true,
  data: [ { id: 1 } ],
};
type TData = InferQueryResultData<typeof queryResult>;
// TData is Row[]
```

### InferAsyncQueryResultSuccess

Infer the success part (data) of an AsyncQueryResult.

```typescript
import type { InferAsyncQueryResultData, AsyncQueryResult } from "@flowblade/source-kysely";

type Row = { id: number };
const getQueryResult = async (): AsyncQueryResult<Row[]> => {
    return {
        success: true,
        data: [{ id: 1 }],
    };
};
type TData = InferAsyncQueryResultData<ReturnType<typeof getQueryResult>>;
// TData is Row[]
```

## Utils

### createKyselyMssqlDialect

```typescript
import { default as Tedious } from 'tedious';
import { TediousConnUtils, createKyselyMssqlDialect } from '@flowblade/source-kysely';

const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

const dialect = createKyselyMssqlDialect({
    tediousConfig,
    // 👉 Optional tarn pool options
    poolOptions: {
        min: 0,                        // Minimum number of connections, default 0
        max: 10,                       // Minimum number of connections, default 10
        validateConnections: true,     // Revalidate new connections, default true
        propagateCreateError: false,   // Propagate connection creation errors, default false
        log: (msg) => console.log(msg) // Custom logger, default noop
    },
    // 👉 Optional tarn pool options
    dialectConfig: {
        // 👉 Reset connection on pool release, default true
        resetConnectionOnRelease: true,
        // 👉 Example based on https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
        tediousTypes: { ...Tedious.TYPES, NVarChar: Tedious.TYPES.VarChar}
    }
});

const db = new Kysely<DB>({
    dialect
})
```

> ℹ️ **Note**: For performance you can avoid connection roundtrips by setting `validateConnections` to `false`
> and `resetConnectionOnRelease` to `false`. 

### TediousConnUtils

#### fromJdbcDsn

Parse and validate a JDBC connection string and return a Tedious connection configuration.

```typescript
import { TediousConnUtils } from '@flowblade/source-kysely';

const tediousConfig = TediousConnUtils.fromJdbcDsn(process.env.DB_JDBC_DSN);

const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
const tediousConnection = new Tedious.Connection(tediousConfig);
```

## Compatibility

| Level      | CI | Description                                                                                                                                                                                                                                                                                                                                                            |
|------------|----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|  
| Node       | ✅  | CI for 18.x, 20.x & 22.x.                                                                                                                                                                                                                                                                                                                                              |
| Cloudflare | ✅  | Ensured with @cloudflare/vitest-pool-workers (see [wrangler.toml](https://github.com/belgattitude/flowblade/blob/main/devtools/vitest/wrangler.toml)                                                                                                                                                                                                                   |
| Browserslist | ✅  | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/source-kysely/.browserslistrc) |
| Typescript | ✅  | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI.                                                                                                                                                                                                                                                          |
| ES2022     | ✅  | Dist files checked with [es-check](https://github.com/yowainwright/es-check)                                                                                                                                                                                                                                                                                           |
| Performance| ✅  | Monitored with [codspeed.io](https://codspeed.io/belgattitude/flowblade)                                                                                                                                                                                                                                                                                               |



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
