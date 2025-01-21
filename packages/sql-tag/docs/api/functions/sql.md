[**@flowblade/sql-tag v0.1.7**](../README.md)

***

[@flowblade/sql-tag](../README.md) / sql

# Function: sql()

> **sql**\<`T`\>(`sqlFragments`, ...`parameters`): [`SqlTag`](../type-aliases/SqlTag.md)\<`T`[]\>

Tagged Sql template literal function.

## Type Parameters

• **T** = `unknown`

## Parameters

### sqlFragments

`TemplateStringsArray`

### parameters

...`unknown`[]

## Returns

[`SqlTag`](../type-aliases/SqlTag.md)\<`T`[]\>

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
