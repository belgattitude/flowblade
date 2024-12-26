import { format } from 'sql-formatter';
import { default as sqlt, empty, join } from 'sql-template-tag';

import { sql } from './sql';

const formatPostresql = (sql: string) => {
  return format(sql, { language: 'postgresql' });
};

describe('sql tests', () => {
  it('should return sql and params', () => {
    const params = {
      users: ['John', 'Doe'],
      ids: [1],
    };
    const query = sql<{
      id: number;
      username: string;
    }>`
        SELECT id, username FROM users 
        WHERE username IN (${sql.join(params.users)})
        ${params.ids.length > 0 ? sql`AND id IN (${sql.join(params.ids)})` : sql.empty}          
    `;

    const queryt = sqlt`
        SELECT id, username FROM users 
        WHERE username IN (${join(params.users)})
        ${params.ids.length > 0 ? sql`AND id IN (${join(params.ids)})` : empty}          
    `;

    expect(formatPostresql(query.sql)).toStrictEqual(
      formatPostresql(`
        SELECT id, username FROM users 
        WHERE username IN (?, ?)
        AND id IN (?)
    `)
    );

    expect(formatPostresql(queryt.sql)).toStrictEqual(
      formatPostresql(`
        SELECT id, username FROM users 
        WHERE username IN (?, ?)
        AND id IN (?)
    `)
    );

    expect(query.values).toStrictEqual([...params.users, ...params.ids]);
  });
});
