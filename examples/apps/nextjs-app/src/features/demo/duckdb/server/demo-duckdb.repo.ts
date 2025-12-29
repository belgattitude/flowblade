import type { DuckdbDatasource } from '@flowblade/source-duckdb';
import { sql, type SqlTag } from '@flowblade/sql-tag';

type SearchParams = {
  min?: number;
  max?: number;
  name?: string;
  limit?: number;
  createdAt?: string;
};

type SearchResult = {
  productId: number;
  name: string;
  createdAt: string;
};

export class DemoDuckdbRepo {
  constructor(private ds: DuckdbDatasource) {}

  search = async (params?: SearchParams) => {
    return await this.ds.query(this.getSqlSearch(params));
  };

  getSqlSearch = (params?: SearchParams): SqlTag<SearchResult[]> => {
    const defaultLimit = 1000;
    const {
      min = 0,
      limit = defaultLimit,
      name = 'test',
      createdAt = '2025-01-22T23:54:41.114Z',
    } = params ?? {};
    const query = sql<SearchResult>`

      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,${sql.raw(String(limit))}) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${name} as name,
             strftime(createdAt, '%Y-%m-%dT%H:%M:%S.%fZ') as createdAt
             
      FROM products 
      WHERE productId >= ${min}::INTEGER
      AND createdAt < ${createdAt}::TIMESTAMPTZ
    `;
    return query;
  };
}
