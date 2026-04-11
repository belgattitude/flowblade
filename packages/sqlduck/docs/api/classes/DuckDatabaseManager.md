[**@flowblade/sqlduck v0.16.0**](../README.md)

***

[@flowblade/sqlduck](../README.md) / DuckDatabaseManager

# Class: DuckDatabaseManager

## Constructors

### Constructor

> **new DuckDatabaseManager**(`conn`, `params?`): `DuckDatabaseManager`

#### Parameters

##### conn

`DuckDBConnection`

##### params?

###### logger?

`Logger`

#### Returns

`DuckDatabaseManager`

## Methods

### analyze()

> **analyze**(): `Promise`\<`boolean`\>

The statistics recomputed by the ANALYZE statement are only used for join order optimization.

It is therefore recommended to recompute these statistics for improved join orders,
especially after performing large updates (inserts and/or deletes).

#### Returns

`Promise`\<`boolean`\>

#### Link

https://duckdb.org/docs/stable/sql/statements/analyze

***

### attach()

> **attach**(`dbParams`, `options?`): `Promise`\<[`Database`](Database.md)\>

Attach a database to the current connection

#### Parameters

##### dbParams

\{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `type`: `"memory"`; \} \| \{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `path`: `string`; `type`: `"filesystem"`; \}

##### options?

`DuckDatabaseAttachCommandOptions`

#### Returns

`Promise`\<[`Database`](Database.md)\>

#### Example

```typescript
const dbManager = new DuckDatabaseManager(conn);
const database = dbManager.attach({
  type: 'memory', // can be 'filesystem'...
  alias: 'mydb',
  options: { COMPRESS: 'true' }
});

console.log(database.alias); // 'mydb'
```

***

### attachIfNotExists()

> **attachIfNotExists**(`dbParams`): `Promise`\<[`Database`](Database.md)\>

#### Parameters

##### dbParams

\{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `type`: `"memory"`; \} \| \{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `path`: `string`; `type`: `"filesystem"`; \}

#### Returns

`Promise`\<[`Database`](Database.md)\>

***

### attachOrReplace()

> **attachOrReplace**(`dbParams`): `Promise`\<[`Database`](Database.md)\>

#### Parameters

##### dbParams

\{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `type`: `"memory"`; \} \| \{ `alias`: `string`; `options?`: \{ `accessMode?`: `"READ_ONLY"` \| `"READ_WRITE"`; `blockSize?`: `number`; `compress?`: `boolean`; `encryptionCipher?`: `"CBC"` \| `"CTR"` \| `"GCM"`; `encryptionKey?`: `string`; `rowGroupSize?`: `number`; `storageVersion?`: `string`; `type?`: `"DUCKDB"` \| `"SQLITE"` \| `"MYSQL"` \| `"PostgreSQL"`; \}; `path`: `string`; `type`: `"filesystem"`; \}

#### Returns

`Promise`\<[`Database`](Database.md)\>

***

### checkpoint()

> **checkpoint**(`dbAlias`): `Promise`\<`boolean`\>

#### Parameters

##### dbAlias

`string`

#### Returns

`Promise`\<`boolean`\>

***

### createDatabaseFile()

> **createDatabaseFile**(`params`): `Promise`\<\{ `status`: `"exists"` \| `"created"`; \}\>

Helper to create an initial database file.

#### Parameters

##### params

###### createDirectory?

`boolean`

###### path

`string`

#### Returns

`Promise`\<\{ `status`: `"exists"` \| `"created"`; \}\>

***

### detach()

> **detach**(`dbAlias`): `Promise`\<`boolean`\>

#### Parameters

##### dbAlias

`string`

#### Returns

`Promise`\<`boolean`\>

***

### detachIfExists()

> **detachIfExists**(`dbAlias`): `Promise`\<`boolean`\>

#### Parameters

##### dbAlias

`string`

#### Returns

`Promise`\<`boolean`\>

***

### showDatabases()

> **showDatabases**(): `Promise`\<`Record`\<`string`, `JS`\>[]\>

#### Returns

`Promise`\<`Record`\<`string`, `JS`\>[]\>

***

### vacuum()

> **vacuum**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>
