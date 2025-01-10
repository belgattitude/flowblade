import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type DatasourceQueryInfo,
  type QError,
  QMeta,
  type QMetaSqlSpan,
  type QResult,
} from '@flowblade/core';
import type { Compilable, InferResult, Kysely, RawBuilder } from 'kysely';
import type { Writable } from 'type-fest';

import { parseBigIntToSafeInt } from '../utils/internal/internal-utils';

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
};

type KyselyQueryOrRawQuery<T = unknown> = Compilable<T> | RawBuilder<T>;
type KyselyInferQueryOrRawQuery<T extends KyselyQueryOrRawQuery> =
  T extends RawBuilder<unknown>
    ? Awaited<ReturnType<T['execute']>>['rows']
    : T extends Compilable
      ? InferResult<T>
      : never;

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

  /**
   * Return the underlying kysely connection.
   *
   * Warning: this isn't covered by api stability. Use at your own risks.
   */
  getConnection = (): Kysely<TDatabase> => this.db;

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
   * const result = await ds.query(rawSql);
   *
   * // Option 1: the QResult object contains the data, metadata and error
   * //  - data:  the result rows (TData or undefined if error)
   * //  - error: the error (QError or undefined if success)
   * //  - meta:  the metadata (always present)
   *
   * const { data, meta, error } = result;
   *
   * // Option 2: You operate over the result, ie: mapping the data
   *
   * const { data } = result.map((row) => {
   *   return {
   *    ...data
   *    key: `key-${row.productId}`
   * })
   * ```
   */
  query = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    info?: DatasourceQueryInfo
  ): Promise<QResult<TData, QError>> => {
    const { name } = info ?? {};

    const compiled = query.compile(this.db);
    const meta = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters as Writable<QMetaSqlSpan['params']>,
    });

    const start = performance.now();

    try {
      const r = await this.db.executeQuery(compiled);
      const { numAffectedRows, ...result } = r;
      meta.timeMs = performance.now() - start;
      meta.affectedRows = parseBigIntToSafeInt(numAffectedRows) ?? 0;
      return createQResultSuccess(
        result.rows as TData,
        new QMeta({ name, spans: meta })
      );
    } catch (err) {
      meta.timeMs = performance.now() - start;
      return createQResultError(
        {
          message: (err as Error).message,
        },
        new QMeta({
          name,
          spans: meta,
        })
      );
    }
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream<
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    _query: TQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QResult<TData, QError>> {
    throw new Error('Not implemented yet');
  }
}
