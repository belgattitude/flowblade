import type {
  Compilable,
  CompiledQuery,
  InferResult,
  Kysely,
  RawBuilder,
} from 'kysely';
import type { Writable } from 'type-fest';

import type {
  DatasourceInterface,
  DatasourceQueryInfo,
} from '../core/datasource.interface';
import type {
  AsyncQueryResult,
  QueryResult,
  QueryResultMeta,
} from '../core/query-result';
import {
  createResultError,
  createResultSuccess,
} from '../core/query-result-factories';
import { parseBigIntToSafeInt } from '../utils/internal/internal-utils';

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
};

export class KyselyDatasource<TDatabase> implements DatasourceInterface {
  private db: Kysely<TDatabase>;

  /**
   * Return a new Kysely expression builder.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ db });
   *
   * // Kysely Expression builder (query, update, delete, merge...)
   * const eb = ds.queryBuilder;
   *
   * const query = eb.selectFrom('brand as b')
   *                 .select(['b.id', 'b.name']);
   *
   * ```
   */

  public get queryBuilder(): Pick<
    Kysely<TDatabase>,
    | 'mergeInto'
    | 'selectFrom'
    | 'selectNoFrom'
    | 'deleteFrom'
    | 'insertInto'
    | 'replaceInto'
    | 'with'
    | 'withRecursive'
  > {
    return this.db;
  }

  constructor(params: Params<TDatabase>) {
    this.db = params.connection;
  }

  getConnection = (): Kysely<TDatabase> => this.db;

  /**
   * Run a raw query on the datasource and return the result.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource, isQueryResultError } from '@flowblade/source-kysely';
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
  queryRaw = async <
    TRawQuery extends RawBuilder<unknown>,
    TData extends unknown[] = Awaited<ReturnType<TRawQuery['execute']>>['rows'],
  >(
    rawQuery: TRawQuery,
    info?: DatasourceQueryInfo
  ): AsyncQueryResult<TData> => {
    const { name } = info ?? {};
    let compiled: CompiledQuery | null = null;
    let meta: QueryResultMeta = {};
    try {
      compiled = rawQuery.compile(this.db);

      meta.query ??= {
        ...(name === undefined ? {} : { name }),
        sql: compiled.sql,
        params: compiled.parameters as Writable<unknown[]>,
      };

      const start = performance.now();
      const { numAffectedRows, ...result } = await rawQuery.execute(this.db);
      const timeMs = performance.now() - start;
      const affectedRows = parseBigIntToSafeInt(numAffectedRows);

      meta = {
        ...meta,
        timeMs,
        ...(affectedRows === undefined ? {} : { affectedRows }),
      };
      return createResultSuccess(result.rows as TData, meta);
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
    const { name } = info ?? {};
    let compiled: CompiledQuery | null = null;
    let meta: QueryResultMeta = {};
    try {
      compiled = query.compile();

      meta.query ??= {
        ...(name === undefined ? {} : { name }),
        sql: compiled.sql,
        params: compiled.parameters as Writable<unknown[]>,
      };

      const start = performance.now();
      const r = await this.db.executeQuery(compiled);
      const { numAffectedRows, ...result } = r;
      const timeMs = performance.now() - start;

      const affectedRows = parseBigIntToSafeInt(numAffectedRows);

      meta = {
        ...meta,
        timeMs,
        ...(affectedRows === undefined ? {} : { affectedRows }),
      };
      return createResultSuccess(result.rows as TData, meta);
    } catch (err) {
      return createResultError(
        {
          message: (err as Error).message,
        },
        meta
      );
    }
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
