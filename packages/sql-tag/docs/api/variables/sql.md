[**@flowblade/sql-tag v0.1.10**](../README.md)

***

[@flowblade/sql-tag](../README.md) / sql

# Variable: sql

> `const` **sql**: \<`T`\>(`sqlFragments`, ...`parameters`) => [`SqlTag`](../type-aliases/SqlTag.md)\<`T`[]\> & `object`

Tagged Sql template literal function.

## Type declaration

### empty

#### Get Signature

> **get** **empty**(): [`SqlTag`](../type-aliases/SqlTag.md)\<`null`\>

Placeholder value for an empty SQL string. Useful for conditionals and
equivalent to sql.raw("").

##### Example

```typescript
import { sql } from '@flowblade/sql-tag';

const excludeDeleted = true;

const query = sql<{ id: number }>`
      SELECT id
      FROM products
      WHERE id < 1000
      ${excludeDeleted ? sql`AND deleted_at is not null` : sql.empty}
    `;
```

##### Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`null`\>

### bulk()

> **bulk**\<`T`\>(`data`, `separator?`, `prefix?`, `suffix?`): [`SqlTag`](../type-aliases/SqlTag.md)\<`T`\>

Accepts an array of arrays, and returns the SQL with the values joined together in
a format useful for bulk inserts.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### data

readonly readonly `unknown`[][]

##### separator?

`string`

##### prefix?

`string`

##### suffix?

`string`

#### Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`T`\>

#### Example

```typescript
import { sql } from '@flowblade/sql-tag';

const insert = sql`
   INSERT INTO product (name, price, stock, status)
   VALUES ${sql.bulk([
     ['Laptop', 999.99, 50, 'active'],
     ['Keyboard', 79.99, 100, 'active'],
   ])}
  `;

const { text, sql, statement, values } = insert;

insert.text;   //=> "INSERT INTO product (name, price, stock, status) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)"
insert.sql;    //=> "INSERT INTO product (name, price, stock, status) VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?)"
insert.values; //=> ["Laptop", 999.99, 50, "active", "Keyboard", 79.99, 100, "active"]
```

### if()

> **if**(`condition`, `then`, `otherwise`): [`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

Conditionally add a part of the SQL string.

You can prefer using 'if' over the ternary operator for
better readability (when using prettier or biome)/

```typescript
const userIds: string[] = []; // Parameters

const query = sql<>`
   SELECT id, username FROM users
   WHERE 1=1
   ${sql.if(
     params.ids.length > 0,
     () => sql`AND id IN (${sql.join(userIds.ids)})`  // 👈 "then" as second parameter
     () => sql.empty   // 👈 Optional 'else' as third parameter (default to sql.empty)
   )}
 `;
```

#### Parameters

##### condition

`boolean`

##### then

() => [`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

##### otherwise

() => [`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

#### Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

### join()

> **join**(`array`, `separator`, `prefix?`, `suffix?`): [`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

Joins the array of values with an optional separator (default to ', ').

#### Parameters

##### array

readonly `unknown`[]

##### separator

`string` = `', '`

##### prefix?

`string`

##### suffix?

`string`

#### Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`unknown`\>

#### Example

```typescript
import { sql } from '@flowblade/sql-tag';

const ids = [1, 2, 3];
const tenant = 'acme';
const organization = 'acme';

const query = sql<{ id: number }>`
      SELECT id
      FROM products
      WHERE id in ${sql.join(ids)}
      AND ${sql.join([
        sql`tenant = ${tenant}`,
        sql`organization = ${organization}`
      ], 'AND')}
    `;
```

### unsafeRaw()

> **unsafeRaw**\<`T`\>(`sql`): [`SqlTag`](../type-aliases/SqlTag.md)\<`T`\>

Accepts a string and returns a TaggedSql instance, useful if you want some part of the SQL
to be dynamic.

⚠️ Do not forget to sanitize user input to unsafeRaw to prevent SQL injection vulnerability.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### sql

`string`

#### Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`T`\>

#### Example

```typescript
import { sql } from '@flowblade/sql-tag';

const query = sql.unsafeRaw(
  "SELECT * FROM products WHERE id = 1",
);
```

## Example

```typescript
import { sql } from '@flowblade/sql-tag';

const params = {
  ids: [1, 2, 3]
}

const query = sql<{ id: number }>`
      SELECT id
      FROM products
      WHERE id IN ${sql.join(params.ids)}
    `;

query.sql;       // 'SELECT id FROM products WHERE id IN (?, ?, ?)'
query.text;      // 'SELECT id FROM products WHERE id IN ($1, $2, $3)'
query.statement; // 'SELECT id FROM products WHERE id IN (:1, :2, :3)'
query.values;    // [1, 2, 3]
```
