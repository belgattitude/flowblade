[**@flowblade/sqlduck v0.16.0**](../README.md)

***

[@flowblade/sqlduck](../README.md) / DuckMemory

# Class: DuckMemory

## Constructors

### Constructor

> **new DuckMemory**(`duckdbConn`): `DuckMemory`

#### Parameters

##### duckdbConn

`DuckDBConnection`

#### Returns

`DuckMemory`

## Methods

### getAll()

> **getAll**(`params?`): `Promise`\<`DuckMemoryRow`[]\>

#### Parameters

##### params?

###### orderBy?

`"memory_usage_bytes_desc"` \| `"tag_desc"` \| `"tag_asc"`

#### Returns

`Promise`\<`DuckMemoryRow`[]\>

***

### getByTag()

> **getByTag**(`tag`): `Promise`\<`DuckMemoryRow` \| `null`\>

#### Parameters

##### tag

`"BASE_TABLE"` \| `"HASH_TABLE"` \| `"PARQUET_READER"` \| `"CSV_READER"` \| `"ORDER_BY"` \| `"ART_INDEX"` \| `"COLUMN_DATA"` \| `"METADATA"` \| `"OVERFLOW_STRINGS"` \| `"IN_MEMORY_TABLE"` \| `"ALLOCATOR"` \| `"EXTENSION"` \| `"TRANSACTION"` \| `"EXTERNAL_FILE_CACHE"` \| `"WINDOW"` \| `"OBJECT_CACHE"`

#### Returns

`Promise`\<`DuckMemoryRow` \| `null`\>

***

### getSummary()

> **getSummary**(): `Promise`\<`DuckMemorySummary`\>

#### Returns

`Promise`\<`DuckMemorySummary`\>
