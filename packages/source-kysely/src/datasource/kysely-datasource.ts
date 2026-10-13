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
} from "@flowblade/core";
import type { Logger } from "@logtape/logtape";
import type {
  Compilable,
  InferResult,
  InflightQueryAbortStrategy,
  Kysely,
  RawBuilder,
} from "kysely";

import { getKyselyErrorMessage } from "../internal/get-kysely-error-message.ts";
import { isKyselyStreamable } from "../internal/is-kysely-streamable.ts";
import { parseBigIntToSafeInt } from "../internal/parse-bigint-to-safeint.ts";
import { kyselyDefaultLogtapeLogger } from "../logger/kysely-default-logtape-logger.ts";

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
  /**
   * What happens to an in-flight query when its `signal` is aborted.
   *
   * - `'ignore query'` (Kysely default): stop waiting for the results, the query
   *   keeps running on the database and the connection is released once it settles.
   * - `'cancel query'`: cancel the query on the database (ie: mssql, postgres, mysql).
   *   Falls back to `'ignore query'` with a warning when the dialect can't.
   * - `'kill session'`: kill the database session running the query.
   *
   * Can be overridden per query.
   */
  inflightQueryAbortStrategy?: InflightQueryAbortStrategy;
  /**
   * Whether to include the query params in the logs, set to `false`
   * when they might contain sensitive data.
   *
   * Params are still available in the result meta (QMeta spans).
   *
   * @default true
   */
  logParams?: boolean;
};

export type KyselyQueryOptions = QueryOptions & {
  /**
   * Override the datasource `inflightQueryAbortStrategy` for this query.
   */
  inflightQueryAbortStrategy?: InflightQueryAbortStrategy;
};

type KyselyQueryOrRawQuery<T = unknown> = Compilable<T> | RawBuilder<T>;
type KyselyInferQueryOrRawQuery<T extends KyselyQueryOrRawQuery> =
  T extends RawBuilder<unknown>
    ? Awaited<ReturnType<T["execute"]>>["rows"]
    : T extends Compilable
      ? InferResult<T>
      : never;

export class KyselyDatasource<TDatabase> implements DatasourceInterface {
  private readonly db: Kysely<TDatabase>;
  private readonly logger: Logger;
  private readonly logParams: boolean;
  private readonly inflightQueryAbortStrategy:
    | InflightQueryAbortStrategy
    | undefined;

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
    | "mergeInto"
    | "selectFrom"
    | "selectNoFrom"
    | "deleteFrom"
    | "updateTable"
    | "insertInto"
    | "replaceInto"
    | "with"
    | "withRecursive"
    | "withSchema"
    | "withPlugin"
    | "withoutPlugins"
    | "withTables"
  > {
    return this.db;
  }

  constructor(params: Params<TDatabase>) {
    this.db = params.connection;
    this.logger = params.logger ?? kyselyDefaultLogtapeLogger;
    this.inflightQueryAbortStrategy = params.inflightQueryAbortStrategy;
    this.logParams = params.logParams ?? true;
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
    options?: KyselyQueryOptions
  ): Promise<QResult<TData, QError>> => {
    const name = options?.name ?? "anonymous";

    const compiled = query.compile(this.db);
    const span = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters,
    });

    const start = Date.now();

    try {
      this.logger.debug(
        'Executing query "{queryName}"',
        this.getLogFromSpan(name, span, "query")
      );

      const r = await this.db.executeQuery(compiled, {
        signal: options?.signal,
        inflightQueryAbortStrategy:
          options?.inflightQueryAbortStrategy ??
          this.inflightQueryAbortStrategy,
      });
      const { numAffectedRows, ...result } = r;
      span.timeMs = Date.now() - start;
      span.affectedRows = parseBigIntToSafeInt(numAffectedRows) ?? 0;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span, "query")
      );

      return createQResultSuccess(
        result.rows as TData,
        new QMeta({ name, spans: span })
      );
    } catch (error) {
      span.timeMs = Date.now() - start;

      const message = getKyselyErrorMessage(error);

      this.logger.error('Query "{queryName}" failed: {errorMessage}', {
        ...this.getLogFromSpan(name, span, "query"),
        errorMessage: message,
      });

      return createQResultError(
        {
          message,
          cause: error,
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
    options?: KyselyQueryOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TQuery, TData>(query, options);
    return {
      data: result.getOrThrow(
        (qErr) =>
          new Error(`Query failed: ${qErr.message}`, { cause: qErr.cause })
      ),
      meta: result.meta,
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
   * @yields {TData[0]} Each row of the query result as it is streamed.
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
      throw new Error("Query is not streamable, be sure to check usage");
    }
    const { chunkSize, signal } = options ?? {};
    const name = options?.name ?? "anonymous";

    const compiled = query.compile(this.db);

    const span = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters,
    });

    const start = Date.now();

    this.logger.debug(
      'Streaming query "{queryName}"',
      this.getLogFromSpan(name, span, "stream")
    );

    let rowCount = 0;
    let failed = false;

    try {
      for await (const row of query.stream({
        chunkSize,
        signal,
      }) as AsyncIterableIterator<TData[0]>) {
        rowCount++;
        yield row;
      }
    } catch (error) {
      failed = true;
      span.timeMs = Date.now() - start;
      span.affectedRows = rowCount;

      const message = getKyselyErrorMessage(error);

      this.logger.error(
        'Streaming query "{queryName}" failed: {errorMessage}',
        {
          ...this.getLogFromSpan(name, span, "stream"),
          errorMessage: message,
        }
      );

      throw new Error(message, {
        cause: error,
      });
    } finally {
      // Runs on completion, on early exit (break / return) and on failure,
      // the failure being already logged as an error above.
      if (!failed) {
        span.timeMs = Date.now() - start;
        span.affectedRows = rowCount;

        this.logger.info(
          'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
          this.getLogFromSpan(name, span, "stream")
        );
      }
    }
  }

  private readonly getLogFromSpan = (
    queryName: string,
    span: QMetaSqlSpan,
    method: "stream" | "query"
  ) => {
    return {
      queryName,
      source: "kysely",
      method,
      type: span.type,
      sql: span.sql,
      ...(this.logParams ? { params: span.params } : {}),
      affectedRows: span.affectedRows,
      timeMs: span.timeMs,
    };
  };
}
