[**@flowblade/sqlduck v0.3.0**](../README.md)

---

[@flowblade/sqlduck](../README.md) / Table

# Class: Table

## Constructors

### Constructor

> **new Table**(`fqTableOrName`): `Table`

#### Parameters

##### fqTableOrName

`string` | `FQTable`

#### Returns

`Table`

## Accessors

### databaseName

#### Get Signature

> **get** **databaseName**(): `string` \| `undefined`

##### Returns

`string` \| `undefined`

---

### schemaName

#### Get Signature

> **get** **schemaName**(): `string` \| `undefined`

##### Returns

`string` \| `undefined`

---

### tableName

#### Get Signature

> **get** **tableName**(): `string`

##### Returns

`string`

## Methods

### getFullName()

> **getFullName**(`options?`): `string`

Return fully qualified table name by concatenating
database, schema and table with a 'dot' separator.

#### Parameters

##### options?

###### defaultDatabase?

`string`

###### defaultSchema?

`string`

#### Returns

`string`

---

### withDatabase()

> **withDatabase**(`database`): `Table`

#### Parameters

##### database

`string`

#### Returns

`Table`

---

### withSchema()

> **withSchema**(`schema`): `Table`

#### Parameters

##### schema

`string`

#### Returns

`Table`
