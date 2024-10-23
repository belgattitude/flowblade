# @flowblade/source-kysely

## Install

```bash
yarn add @flowblade/source-kysely

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

## Utils

### createKyselySqlServerDialect

```typescript
import * as Tedious from 'tedious';
import { TediousConnUtils, createKyselySqlServerDialect } from '@flowblade/source-kysely';

const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
const tediousConnection = new Tedious.Connection(tediousConfig);

const dialect = createKyselySqlServerDialect(tediousConfig, {
  // Optional tarn pool options
  tarnPool: {
    min: 0,
    max: 10
  },
  // Optional: customize tedious types
  // Example based on https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
  tediousTypes: { ...Tedious.TYPES, NVarChar: Tedious.TYPES.VarChar}
});

const db = new Kysely<DB>({
  dialect
})
```

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
