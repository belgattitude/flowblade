import { sql } from 'kysely';

import { createE2eDatasource } from '../utils/create-e2e-datasource';

describe('Datasource sqlserver', () => {
  const ds = createE2eDatasource('sql-server');
  const db = ds.getConnection();
  describe('Kysely raw queries', () => {
    it('01. basicQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT 1 as one`;
      const result = await ds.queryRaw(rawSql);
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
      const rows = await ds.queryRaw(rawSql);
      const stabletimeMs = 0.1;
      rows.meta.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });
  });

  describe.sequential('Kysely select queries', () => {
    it('upsert a brand', async () => {
      const params = {
        id: 1,
        name: 'Brand 1',
      };
      const query = db
        .mergeInto('brand as Target')
        .using('brand as Source', 'Target.id', 'Source.id')
        .whenMatched()
        .thenUpdateSet({
          name: params.name,
          updated_at: new Date(),
        })
        .whenNotMatched()
        .thenInsertValues({
          name: params.name,
          created_at: new Date(),
        })
        .output(['inserted.id', 'inserted.name', 'inserted.flag_active']);

      const rows = await ds.query(query);
      const stabletimeMs = 0.1;
      rows.meta.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });

    it('get some brands', async () => {
      const query = db.selectFrom('brand as b').select(['b.id', 'b.name']);
      const rows = await ds.query(query);
      const stabletimeMs = 0.1;
      rows.meta.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });
  });
});
