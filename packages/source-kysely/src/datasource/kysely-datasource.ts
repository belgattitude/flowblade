import type {
  Compilable,
  CompiledQuery,
  InferResult,
  Kysely,
  RawBuilder,
} from 'kysely';
import type { Simplify, Writable } from 'type-fest';

import type { DatasourceInterface } from '../core/datasource.interface';
import type {
  QueryResult,
  QueryResultError,
  QueryResultMeta,
  QueryResultSuccess,
} from '../core/query-result';
import { parseBigIntToSafeInt } from '../utils/internal/internal-utils';

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
};

const createError = (method: string, message: string, cause?: Error): Error => {
  const c = cause && cause instanceof Error ? cause : undefined;
  return new Error(`[KyselyDatasource.${method}] - ${message}: ${c?.message}`, {
    cause: c,
  });
};

const createResultSuccess = <T>(
  data: T,
  meta: QueryResultMeta
): QueryResultSuccess<T> => ({
  success: true,
  data,
  meta,
});

const createResultError = (
  error: QueryResultError['error'],
  meta?: QueryResultError['meta']
): QueryResultError => ({
  success: false,
  error: {
    ...error,
    message: `Query failed: ${error.message}`,
  },
  ...(meta === undefined ? {} : { meta }),
});

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
   * const eb = ds.eb();
   *
   * const query = eb.selectFrom('brand as b')
   *                 .select(['b.id', 'b.name']);
   *
   * ```
   */

  eb(): Kysely<TDatabase> {
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
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   * import { sql } from 'kysely';
   *
   * const ds = new KyselyDatasource({ db });
   *
   * const rawSql = sql<{one: number}>`SELECT 1 as one`;
   *
   * const result = await ds.queryRaw(rawSql);
   * console.log(result.data);
   * console.log(result.meta);
   * ```
   *
   * @throw Error if the query fails (check Error.cause for the underlying error)
   */
  queryRaw = async <
    TRawQuery extends RawBuilder<unknown>,
    TQueryResult = Simplify<Awaited<ReturnType<TRawQuery['execute']>>['rows']>,
  >(
    rawQuery: TRawQuery
  ): Promise<QueryResult<TQueryResult>> => {
    let compiled: CompiledQuery | null = null;
    let meta: QueryResultMeta = {};
    try {
      compiled = rawQuery.compile(this.db);

      meta.query ??= {
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

      return createResultSuccess(result.rows as TQueryResult, meta);
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
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ db });
   * const query = ds.eb // This gives access to Kysely expression builder
   *         .selectFrom('brand as b')
   *         .select(['b.id', 'b.name'])
   *         .leftJoin('product as p', 'p.brand_id', 'b.id')
   *         .select(['p.id as product_id', 'p.name as product_name'])
   *         .where('b.created_at', '<', new Date())
   *         .orderBy('b.name', 'desc');
   *
   * const result = await ds.query(query);
   * console.log(result.data);
   * console.log(result.meta);
   * ```
   *
   * @throw Error if the query fails (check Error.cause for the underlying error)
   */
  query = async <
    TQuery extends Compilable<unknown>,
    TQueryResult = InferResult<TQuery>,
  >(
    query: TQuery
  ): Promise<QueryResult<TQueryResult>> => {
    let compiled: CompiledQuery | null = null;
    let meta: QueryResultMeta = {};
    try {
      const start = performance.now();
      compiled = query.compile();

      meta.query ??= {
        sql: compiled.sql,
        params: compiled.parameters as Writable<unknown[]>,
      };

      const r = await this.db.executeQuery(compiled);
      const { numAffectedRows, ...result } = r;
      const timeMs = performance.now() - start;

      const affectedRows = parseBigIntToSafeInt(numAffectedRows);

      meta = {
        ...meta,
        timeMs,
        ...(affectedRows === undefined ? {} : { affectedRows }),
      };
      return createResultSuccess(result.rows as TQueryResult, meta);
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
  async *stream<TQuery extends Compilable<unknown>, TRet = InferResult<TQuery>>(
    _query: TQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<TRet>> {
    throw new Error('Not implemented yet');
  }
}
