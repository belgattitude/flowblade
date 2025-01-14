import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll } from 'vitest';

import { sql } from '../src';

const getDDLCreateTableProduct = () => sql`
  CREATE TABLE product (
     product_id SERIAL PRIMARY KEY,
     name TEXT UNIQUE,
     price DECIMAL(10,2),
     stock INTEGER,
     status TEXT,
     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

describe('sql-tag pglite e2e', () => {
  const db = new PGlite();

  beforeAll(async () => {
    await db.exec(getDDLCreateTableProduct().sql);
  });
  afterAll(async () => {
    await db.exec('DROP TABLE IF EXISTS product');
  });

  it('should allow bulk', async () => {
    const insert = sql`
        INSERT INTO product (name, price, stock, status) 
        VALUES ${sql.bulk([
          ['Laptop', 999.99, 50, 'active'],
          ['Keyboard', 79.99, 100, 'active'],
          ['Mouse', 29.99, 200, 'active'],
        ])}
    `;
    const { text, values } = insert;
    const result = await db.query(text, values, {});
    expect(result.affectedRows).toBe(3);
  });

  it('should allow adding limit', async () => {
    const limit = 1;
    const query = sql`
      SELECT unnest(ARRAY[1,2,3]) as id LIMIT ${limit}
    `;
    const { text, values } = query;
    const result = await db.query(text, values, {});
    expect(result.rows.length).toBe(1);
  });
});
