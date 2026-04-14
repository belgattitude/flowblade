import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type QError,
  QMeta,
  type QMetaSqlSpan,
  type QResult,
  type QueryOptions,
  type QueryStreamOptions,
} from '@flowblade/core';
import type { Logger } from '@logtape/logtape';
import type { Compilable, InferResult, Kysely, RawBuilder } from 'kysely';
import type { Writable } from 'type-fest';

import { isKyselyStreamable } from '../internal/is-kysely-streamable';
import { parseBigIntToSafeInt } from '../internal/parse-bigint-to-safeint';
import { kyselyDefaultLogtapeLogger } from '../logger/kysely-default-logtape-logger';

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
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
  private logger: Logger;

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
    | 'updateTable'
    | 'insertInto'
    | 'replaceInto'
    | 'with'
    | 'withRecursive'
    | 'withSchema'
    | 'withPlugin'
    | 'withoutPlugins'
    | 'withTables'
  > {
    return this.db;
  }

  constructor(params: Params<TDatabase>) {
    this.db = params.connection;
    this.logger = params.logger ?? kyselyDefaultLogtapeLogger;
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
   *    ...row,
   *    key: `key-${row.productId}`
   * }})
   * ```
   */
  query = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions
  ): Promise<QResult<TData, QError>> => {
    const name = options?.name ?? 'anonymous';

    const compiled = query.compile(this.db);
    const span = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters as Writable<QMetaSqlSpan['params']>,
    });

    const start = Date.now();

    try {
      this.logger.debug(`Executing query "{queryName}"`, {
        queryName: name,
        sql: compiled.sql,
        params: compiled.parameters,
      });

      const r = await this.db.executeQuery(compiled);
      const { numAffectedRows, ...result } = r;
      span.timeMs = Date.now() - start;
      span.affectedRows = parseBigIntToSafeInt(numAffectedRows) ?? 0;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span, 'query')
      );

      return createQResultSuccess(
        result.rows as TData,
        new QMeta({ name, spans: span })
      );
    } catch (err) {
      span.timeMs = Date.now() - start;
      this.logger.error(
        `Query "{queryName}" failed`,
        this.getLogFromSpan(name, span, 'query')
      );

      // Kysely can throw either an Error or an array of Errors, depending on the driver and error type
      // This behaviour exists for example in Tedious/Mssql
      let message = 'Unknown error';
      if (Array.isArray(err)) {
        message = err
          .map((e) => (e instanceof Error ? e.message : String(e)))
          .join('; ');
      } else if (err instanceof Error) {
        message = err.message;
      }

      return createQResultError(
        {
          message,
        },
        new QMeta({
          name,
          spans: span,
        })
      );
    }
  };

  /**
   * Run the query or throw on error
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource();
   * try {
   *  const { data, meta } = await ds.query(sql`select 1`);
   * } catch (e) {
   *   //
   * }
   * ```
   */
  queryOrThrow = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const { data, meta, error } = await this.query(query, options);
    if (error !== undefined) {
      throw new Error(`Query failed: ${error.message}`);
    }
    return {
      data: data! as unknown as TData,
      meta,
    };
  };

  /**
   * Stream query
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
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
   * const stream = ds.stream(query, {
   *    // Chunksize used when reading the database
   *    // @default undefined
   *    chunkSize: undefined
   * });
   *
   * for await (const brand of stream) {
   *   console.log(brand.name)
   *   if (brand.name === 'Something') {
   *     // Breaking or returning before the stream has ended will release
   *     // the database connection and invalidate the stream.
   *     break
   *   }
   * }
   * ```
   *
   * @throws Error
   */
  async *stream<
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: QueryStreamOptions
  ): AsyncIterableIterator<TData[0]> {
    if (!isKyselyStreamable(query)) {
      throw new Error('Query is not streamable, be sure to check usage');
    }
    const { chunkSize } = options ?? {};
    const name = options?.name ?? 'anonymous';

    const compiled = query.compile(this.db);

    const span = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters as Writable<QMetaSqlSpan['params']>,
    });

    const start = Date.now();

    this.logger.debug(
      `Streaming query "${name}"`,
      this.getLogFromSpan(name, span, 'stream')
    );

    try {
      yield* query.stream(chunkSize) as unknown as AsyncIterableIterator<
        TData[0]
      >;
    } catch (err) {
      span.timeMs = Date.now() - start;
      this.logger.error(
        `Streaming query "${name}" failed`,
        this.getLogFromSpan(name, span, 'stream')
      );

      // Kysely can throw either an Error or an array of Errors, depending on the driver and error type
      // This behaviour exists for example in Tedious/Mssql
      let message = 'Unknown error';
      if (Array.isArray(err)) {
        message = err
          .map((e) => (e instanceof Error ? e.message : String(e)))
          .join('; ');
      } else if (err instanceof Error) {
        message = err.message;
      }
      throw new Error(message, {
        cause: err,
      });
    } finally {
      const timeMs = Date.now() - start;
      span.timeMs = timeMs;

      this.logger.info(
        `Streaming query "${name}" executed in ${timeMs}ms.`,
        this.getLogFromSpan(name, span, 'stream')
      );
    }
  }

  private getLogFromSpan = (
    queryName: string,
    span: QMetaSqlSpan,
    method: 'stream' | 'query'
  ) => {
    return {
      queryName,
      source: 'kysely',
      method: method,
      type: span.type,
      sql: span.sql,
      params: span.params,
      affectedRows: span.affectedRows,
      timeMs: span.timeMs,
    };
  };
}
