[**@flowblade/sql-tag-format v0.0.6**](../README.md)

***

[@flowblade/sql-tag-format](../README.md) / SqlFormatter

# Class: SqlFormatter

## Constructors

### new SqlFormatter()

> **new SqlFormatter**(`dialect`, `formatterOptions`?): [`SqlFormatter`](SqlFormatter.md)

SqlFormatter constructor

#### Parameters

##### dialect

`"bigquery"` | `"db2"` | `"db2i"` | `"hive"` | `"mariadb"` | `"mysql"` | `"n1ql"` | `"plsql"` | `"postgresql"` | `"redshift"` | `"singlestoredb"` | `"snowflake"` | `"spark"` | `"sql"` | `"sqlite"` | `"tidb"` | `"transactsql"` | `"trino"` | `"tsql"`

##### formatterOptions?

[`SqlFormatterOptions`](../type-aliases/SqlFormatterOptions.md)

#### Returns

[`SqlFormatter`](SqlFormatter.md)

#### Example

```typescript
const sqlFormatter = new SqlFormatter('postgresql');

// Alternatively, you can pass in options
// @see https://github.com/sql-formatter-org/sql-formatter/tree/master?tab=readme-ov-file#configuration-options

const pgsqlFormatter = new SqlFormatter('postgresql', {
   keywordCase: 'preserve',
   identifierCase: 'preserve',
   dataTypeCase: 'preserve',
   functionCase: 'preserve',
   logicalOperatorNewline: 'before',
   expressionWidth: 50,
   linesBetweenQueries: 1,
   denseOperators: false,
   newlineBeforeSemicolon: false,
   useTabs: false,
   tabWidth: 2,
});

try {
 const formatted = pgsqlFormatter.formatOrThrow(
    'SELECT * FROM table WHERE id = 1'
 );
} catch (e) {
  // Might throw something similar to: Parse error: Unexpected "[col] from" at line 1 column 8
  console.log('Error:', e);
}
```

## Methods

### formatOrNull()

> **formatOrNull**(`sql`, `params`?): `null` \| `string`

Format sql to string or return null if sql cannot be parsed

#### Parameters

##### sql

`SqlTag`\<`unknown`\>

##### params?

`FormatParams`

#### Returns

`null` \| `string`

string if sql can be parsed, null otherwise

#### Example

```typescript
const sqlFormatter = new SqlFormatter('postgresql');

const formatted = sqlFormatter.formatOrNull(
    'SELECT * FROM table WHERE id = 1'
);
```

***

### formatOrThrow()

> **formatOrThrow**(`sql`, `params`?): `string`

Format sql to string or throw an error if sql cannot be parsed

#### Parameters

##### sql

`SqlTag`\<`unknown`\>

##### params?

`FormatParams`

#### Returns

`string`

#### Example

```typescript
const sqlFormatter = new SqlFormatter('postgresql');

try {
 const formatted = sqlFormatter.formatOrThrow(
    'SELECT * FROM table WHERE id = 1'
 );
} catch (e) {
  // Might throw something similat to: Parse error: Unexpected "[col] from" at line 1 column 8
  console.log('Error:', e);
}
```

#### Throws

Error is sql cannot be parsed
