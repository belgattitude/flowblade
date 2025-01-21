[**@flowblade/source-kysely v0.13.8**](../README.md)

***

[@flowblade/source-kysely](../README.md) / TediousConnUtils

# Variable: TediousConnUtils

> `const` **TediousConnUtils**: `object`

## Type declaration

### fromJdbcDsn()

> **fromJdbcDsn**: (`jdbcUrl`) => `ConnectionConfiguration`

Parse and validate a JDBC connection string and return a Tedious connection configuration.

#### Parameters

##### jdbcUrl

`string`

#### Returns

`ConnectionConfiguration`

#### Example

```typescript
const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
const tediousConnection = new Tedious.Connection(tediousConfig);
```

#### Throw

TypeError if dsn isn't valid
