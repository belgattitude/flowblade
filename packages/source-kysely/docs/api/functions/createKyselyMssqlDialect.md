[**@flowblade/source-kysely v0.13.8**](../README.md)

***

[@flowblade/source-kysely](../README.md) / createKyselyMssqlDialect

# Function: createKyselyMssqlDialect()

> **createKyselyMssqlDialect**(`params`): `MssqlDialect`

Create a Kysely dialect for Microsoft SQL Server.

## Parameters

### params

`Params`

## Returns

`MssqlDialect`

## Example

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
