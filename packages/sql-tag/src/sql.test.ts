import { format } from 'sql-formatter';
import { default as sqlt, empty, join } from 'sql-template-tag';
import { expectTypeOf } from 'vitest';

import { sql } from './sql';
import type { SqlTag } from './types';

const formatPostresql = (sql: string) => {
  return format(sql, { language: 'postgresql' });
};

describe('sql tests', () => {
  it('should return sql and params', () => {
    const params = {
      users: ['John', 'Doe'],
      ids: [1, 2],
    };
    const query = sql<{
      id: number;
      username: string;
    }>`
        SELECT id, username FROM users 
        WHERE username IN (${sql.join(params.users)}) 
        ${params.ids.length > 0 ? sql`AND id IN (${sql.join(params.ids)})` : sql.empty}          
    `;

    expect(formatPostresql(query.sql)).toStrictEqual(
      formatPostresql(`
        SELECT id, username FROM users 
        WHERE username IN (?, ?)
        AND id IN (?, ?)
    `)
    );

    expect(query.values).toStrictEqual([...params.users, ...params.ids]);
  });

  describe('query composition', () => {
    describe('when using an SqlTag inside another one', () => {
      it('should return sql and params as expected', () => {
        const getSqlUserCountByCountries = (minUsers: number) => sql`
          SELECT 
            c.name as country_name, 
            count(u.id) as user_count 
          FROM country AS c INNER JOIN user u 
          ON c.id = u.country_id
          GROUP BY c.name
          HAVING count(u.id) > ${minUsers}
        `;

        const compression: 'zstd' | 'gzip' = 'zstd';

        const query = sql`
          COPY
          (${getSqlUserCountByCountries(100)})
          TO 'test.parquet'
          (FORMAT 'parquet', COMPRESSION ${compression}, ROW_GROUP_SIZE 100000);
        `;

        expect(query.values).toStrictEqual([100, 'zstd']);
        expect(formatPostresql(query.sql)).toStrictEqual(
          formatPostresql(`
              COPY (
                SELECT
                  c.name as country_name,
                  count(u.id) as user_count
                FROM
                  country AS c
                  INNER JOIN user u ON c.id = u.country_id
                GROUP BY
                  c.name
                HAVING
                  count(u.id) > ?
            ) TO 'test.parquet' (
              FORMAT 'parquet',
              COMPRESSION ?,
              ROW_GROUP_SIZE 100000
            );
          `)
        );
      });
    });
  });

  describe('conditionals with if', () => {
    describe('when condition is true', () => {
      it('should return an the truthy part and as SqlTag type', () => {
        const ids: string[] = ['1', '2'];
        const conditional = sql.if(
          ids.length > 0,
          () => sql`AND id IN (${sql.join(ids)})`
        );
        expect(conditional.sql).toStrictEqual('AND id IN (?, ?)');
        expectTypeOf(conditional).toEqualTypeOf<SqlTag<unknown>>();
      });
    });
    describe('when condition is false', () => {
      it('should return an sql.empty with SqlTag unknown type', () => {
        const emptyIds: string[] = [];
        const conditional = sql.if(
          emptyIds.length > 0,
          () => sql`AND id IN (${sql.join(emptyIds)})`,
          () => sql.empty
        );
        expect(conditional.sql).toStrictEqual('');
        expectTypeOf(conditional).toEqualTypeOf<SqlTag<unknown>>();
      });
    });
  });

  describe('ensure same output between sql-template-tag and sql-tag', () => {
    it('should return the same sql and params', () => {
      const params = {
        users: ['John', 'Doe'],
        ids: [1],
      };
      const sqlTag = sql`
        SELECT id, username FROM users 
        WHERE username IN (${sql.join(params.users)}) 
        ${params.ids.length > 0 ? sql`AND id IN (${sql.join(params.ids)})` : sql.empty}          
      `;

      const sqlTemplateTag = sqlt`
        SELECT id, username FROM users 
        WHERE username IN (${join(params.users)})    
        ${params.ids.length > 0 ? sql`AND id IN (${join(params.ids)})` : empty}          
      `;
      expect(formatPostresql(sqlTag.sql)).toStrictEqual(
        formatPostresql(sqlTemplateTag.sql)
      );
    });
  });
});
