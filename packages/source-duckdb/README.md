# @flowblade/source-duckdb

[![npm](https://img.shields.io/npm/v/@flowblade/source-duckdb?style=for-the-badge&label=Npm&labelColor=444&color=informational)](https://www.npmjs.com/package/@flowblade/source-duckdb)
[![changelog](https://img.shields.io/static/v1?label=&message=changelog&logo=github&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/CHANGELOG.md)
[![bundles](https://img.shields.io/static/v1?label=&message=cjs|esm@treeshake&logo=webpack&style=for-the-badge&labelColor=444&color=informational)](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/.size-limit.cjs)
[![node](https://img.shields.io/static/v1?label=Node&message=18%2b&logo=node.js&style=for-the-badge&labelColor=444&color=informational)](#compatibility)
[![downloads](https://img.shields.io/npm/dm/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://www.npmjs.com/package/@flowblade/source-duckdb)
[![license](https://img.shields.io/npm/l/@flowblade/source-duckdb?style=for-the-badge&labelColor=444)](https://github.com/belgattitude/flowblade/blob/main/LICENSE)

## Install

```bash
yarn add @flowblade/source-duckdb @flowblade/core @duckdb/node-api
```

> Note that at this time duckdb neo is still in alpha. To install use the latest tag
> ie: `@duckdb/node-api@1.2.0-alpha.14`

### Create a duckdb instance

```typescript
import os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { DuckdbDatasource } from '@flowblade/source-duckdb';

// Create a connection to a DuckDB instance
const createConnection = async (
  maxThreads = 4
): Promise<DuckDBConnection> => {
  const availableThreads = os.availableParallelism();
  const maxParallelism = Math.min(maxThreads, availableThreads - 1);
  const threads = availableThreads > 1 ? maxParallelism : undefined;

  const instance = await DuckDBInstance.create(':memory:', {
    // Choose between READ_ONLY or READ_WRITE
    // Note that in READ_WRITE mode concurrency is limited to 1
    // See: https://duckdb.org/docs/connect/concurrency.html
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    // More threads, mome memory
    ...(threads ? { threads: threads.toString(10) } : {}),

  });
  return await instance.connect();
};

const duckdb = await createConnection();

// Create a duckdb datasource
export const ds = new DuckdbDatasource({ connection: duckdb });
```

### Query the database

```typescript
import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';

import { ds } from "./config.ts";

const params = {
    min: 10,
    max: 99,
    name: 'test',
    createdAt: new Date().toISOString(),
};

type Row = { id: number; name: 'test'; createdAt: Date };

const rawSql = sql<Row>`

      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,100) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${params.name} as name,
             createdAt
             
      FROM products 
      WHERE productId BETWEEN ${params.min}::INTEGER AND ${params.max}::INTEGER
      AND createdAt < ${params.createdAt}::TIMESTAMPTZ
    `;

const result = await ds.query(rawSql);

// Option 1: The QResult object contains the data, metadata and error
//  - data:  the result rows (TData or undefined if error)
//  - error: the error (QError or undefined if success)
//  - meta:  the metadata (always present)

const { data, meta, error } = result;

// Option 2: You operate over the result, ie: mapping the data

const { data } = result.map((row) => {
    return {
        id: row.productId,
        key: `key-${row.productId}`
    })

if (data) {
    console.log(data);
}
```


## Compatibility

| Level        | CI | Description                                                                                                                                                                                                                                                                                                                                                            |
|--------------|----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|  
| Node         | ✅  | CI for 18.x, 20.x & 22.x.                                                                                                                                                                                                                                                                                                                                              |
| Cloudflare   | ✅  | Ensured with @cloudflare/vitest-pool-workers (see [wrangler.toml](https://github.com/belgattitude/flowblade/blob/main/devtools/vitest/wrangler.toml)                                                                                                                                                                                                                   |
| Browserslist | ✅  | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/source-duckdb/.browserslistrc) |
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
