import {
  type AsyncQueryResult,
  createResultError,
  createResultSuccess,
  type DatasourceInterface,
  type DatasourceQueryInfo,
  type QueryResult,
  type QueryResultMeta,
} from '@flowblade/core';
import type { TaggedSql } from '@flowblade/sql-tag';
import type { Database } from 'duckdb-async';
import type { Compilable, InferResult } from 'kysely';

type Params = {
  connection: Database;
};

export class DuckDBAsyncDatasource implements DatasourceInterface {
  private db: Database;

  constructor(params: Params) {
    this.db = params.connection;
  }

  getConnection = (): Database => this.db;

  /**
   * Run a raw query on the datasource and return the result.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource, isQueryResultError } from '@flowblade/duckdb';
   * import { sql } from 'kysely';
   *
   * const ds = new KyselyDatasource({ db });
   *
   * const rawSql = sql<{one: number}>`SELECT 1 as one`;
   *
   * const result = await ds.queryRaw(rawSql);
   *
   * // Or with query information (will be sent in the metadata)
   * // const result = await ds.query(query, {
   * //  name: 'getBrands'
   * // });
   *
   * if (isQueryResultError(result)) {
   *   console.error(result.error);
   *   console.error(result.meta);
   * }  else {
   *   console.log(result.data);
   *   console.log(result.meta);
   * }
   * ```
   */
  queryRaw = async <TData extends unknown[]>(
    rawQuery: TaggedSql<TData>,
    info?: DatasourceQueryInfo
  ): AsyncQueryResult<TData> => {
    const { name } = info ?? {};
    let meta: QueryResultMeta = {};
    try {
      const { sql, values: params } = rawQuery;

      meta.query ??= {
        ...(name === undefined ? {} : { name }),
        sql: sql,
        params: params,
      };

      const start = performance.now();
      const result = await this.db.all(sql, ...params);
      const timeMs = performance.now() - start;
      const affectedRows = result.length;

      meta = {
        ...meta,
        timeMs,
        ...(affectedRows === undefined ? {} : { affectedRows }),
      };
      return createResultSuccess(result as TData, meta);
    } catch (err) {
      return createResultError(
        {
          message: (err as Error).message,
        },
        meta
      );
    }
  };

  /**
   * Run a query on the datasource and return the result.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource, isQueryResultError } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ db });
   * const query = ds.queryBuilder // This gives access to Kysely expression builder
   *         .selectFrom('brand as b')
   *         .select(['b.id', 'b.name'])
   *         .leftJoin('product as p', 'p.brand_id', 'b.id')
   *         .select(['p.id as product_id', 'p.name as product_name'])
   *         .where('b.created_at', '<', new Date())
   *         .orderBy('b.name', 'desc');
   *
   * const result = await ds.query(query);
   *
   * // Or with query information (will be sent in the metadata)
   * // const result = await ds.query(query, {
   * //  name: 'getBrands'
   * // });
   *
   * if (isQueryResultError(result)) {
   *   console.error(result.error);
   *   console.error(result.meta);
   * }  else {
   *   console.log(result.data);
   *   console.log(result.meta);
   * }
   * ```
   */
  query = async <
    TQuery extends Compilable<unknown>,
    TData extends unknown[] = InferResult<TQuery>,
  >(
    query: TQuery,
    info?: DatasourceQueryInfo
  ): Promise<QueryResult<TData>> => {
    throw new Error('Not implemented yet');
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream<
    TQuery extends Compilable<unknown>,
    TData = InferResult<TQuery>,
  >(
    _query: TQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<TData[]>> {
    throw new Error('Not implemented yet');
  }
}
