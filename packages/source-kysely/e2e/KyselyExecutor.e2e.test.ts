import { sql } from 'kysely';

import { e2eExecutor } from './e2e.config';

describe('KyselyExecutorE2E', () => {
  const executor = e2eExecutor;
  describe('Kysely raw queries', () => {
    it('01. basicQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT 1 as one`;
      const result = await executor.queryRaw(rawSql);
      const stabletimeMs = 0.1;
      result.meta.timeMs = stabletimeMs;
      expect(result).toStrictEqual({
        data: [
          {
            one: 1,
          },
        ],
        meta: {
          affectedRows: 1,
          timeMs: stabletimeMs,
          query: {
            params: [],
            sql: 'SELECT 1 as one',
          },
        },
      });
      assertType<Row[]>(result.data);
    });

    it('02. basicQuery with params', async () => {
      type Row = {
        one: number;
      };
      const params = {
        number: 1,
        string: 'Hello',
      };

      const rawSql = sql<Row>`
          SELECT 1 as one
          WHERE 1 = ${params.number}
          AND 'Hello' like ${params.string}
      `;
      const rows = await executor.queryRaw(rawSql);
      const stabletimeMs = 0.1;
      rows.meta.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });
  });
});
