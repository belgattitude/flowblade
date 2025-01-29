import type { DuckdbDatasource } from '@flowblade/source-duckdb';
import { sql, type SqlTag } from '@flowblade/sql-tag';

type SearchParams = {
  min?: number;
  max?: number;
  name?: string;
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
    const {
      min = 10,
      max = 99,
      name = 'test',
      createdAt = '2025-01-22T23:54:41.114Z',
    } = params ?? {};

    const query = sql<SearchResult>`

      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,100) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${name} as name,
             createdAt
             
      FROM products 
      WHERE productId BETWEEN ${min}::INTEGER AND ${max}::INTEGER
      AND createdAt < ${createdAt}::TIMESTAMPTZ
    `;
    return query;
  };
}
