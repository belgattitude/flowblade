import {
  type AsyncQResult,
  type DatasourceInterface,
  QErrors,
  QMeta,
  type QMetaSqlSpan,
  type DatasourceDefaultOptions,
  type QueryOneOrThrowOptions,
  type QueryOptions,
  type QueryOrThrowOptions,
  type QueryStreamOptions,
} from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  getOneRowOrThrow,
  toOneRowQResult,
} from "@flowblade/core/datasource";
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
   * @deprecated Use `defaultOptions.query.inflightQueryAbortStrategy`
   * instead, the `defaultOptions` value wins when both are set.
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
  /**
   * Default options, keyed by method name, the options passed per query win:
   * - `query`: options of `query()`, also used by the methods running it
   *   (`queryOrThrow()`, `queryOne()` and `queryOneOrThrow()`),
   * - `queryOrThrow` / `queryOneOrThrow`: error factories, used by the named
   *   method only.
   *
   * @example
   * ```typescript
   * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
   *
   * defaultOptions: {
   *   query: {
   *     // Cancel aborted queries on the database (Kysely default: 'ignore query')
   *     inflightQueryAbortStrategy: "cancel query",
   *   },
   *   // Used by queryOrThrow() only, query() never throws
   *   queryOrThrow: {
   *     onError: ({ error }) => new HttpInternalServerError({ cause: error }),
   *   },
   *   // Used by queryOneOrThrow() only, queryOne() never throws
   *   queryOneOrThrow: {
   *     onError: ({ error }) => new HttpInternalServerError({ cause: error }),
   *     onNoResult: ({ error }) =>
   *       new HttpNotFound({ message: "Resource not found", cause: error }),
   *     onTooManyResults: ({ error, rowCount }) =>
   *       new HttpInternalServerError({
   *         message: `Expected one row, got ${rowCount}`,
   *         cause: error,
   *       }),
   *   },
   * }
   * ```
   */
  defaultOptions?: KyselyDatasourceDefaultOptions;
};

export type KyselyQueryOptions = QueryOptions & {
  /**
   * What happens to an in-flight query when its `signal` is aborted.
   *
   * - `'ignore query'` (Kysely default): stop waiting for the results, the query
   *   keeps running on the database and the connection is released once it settles.
   * - `'cancel query'`: cancel the query on the database (ie: mssql, postgres, mysql).
   *   Falls back to `'ignore query'` with a warning when the dialect can't.
   * - `'kill session'`: kill the database session running the query.
   *
   * Defaults to the datasource `defaultOptions.query.inflightQueryAbortStrategy`.
   */
  inflightQueryAbortStrategy?: InflightQueryAbortStrategy;
};

/**
 * Datasource default options of the `KyselyDatasource`: the core defaults
 * plus the `query()` options.
 */
export type KyselyDatasourceDefaultOptions = DatasourceDefaultOptions & {
  /**
   * Default options of `query()`, also used by the methods running it
   * (`queryOrThrow()`, `queryOne()` and `queryOneOrThrow()`).
   */
  query?: Pick<KyselyQueryOptions, "inflightQueryAbortStrategy">;
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
  private readonly defaultOptions: KyselyDatasourceDefaultOptions;

  /**
   * Return a new Kysely expression builder.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
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
    this.logParams = params.logParams ?? true;
    // oxlint-disable-next-line typescript/no-deprecated -- still supported as an alias
    const { defaultOptions = {}, inflightQueryAbortStrategy } = params;
    this.defaultOptions = {
      ...defaultOptions,
      query: {
        // deprecated param, kept as an alias
        inflightQueryAbortStrategy,
        ...defaultOptions.query,
      },
    };
  }

  /**
   * Return the underlying Kysely instance.
   *
   * Warning: using the underlying driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): Kysely<TDatabase> => this.db;

  /**
   * Run a query and return a QResult object.
   *
   * It never throws: when the query fails, `error` holds a QError (message,
   * `code` "QUERY_FAILED" and the driver error as `cause`, or `code`
   * "ABORTED" and the abort reason as `cause`) and `data` is undefined.
   * `meta` is always present (sql, params, timing, affected rows...).
   *
   * The result is a discriminated union: checking `error` narrows `data`,
   * even after destructuring.
   *
   * Accepts a Kysely query builder or a raw `sql` query from kysely. When
   * aborted with `signal`, the `inflightQueryAbortStrategy` option (default:
   * `defaultOptions.query.inflightQueryAbortStrategy`) decides what happens
   * to the running query.
   *
   * Use `queryOrThrow()` to get the rows directly and throw on error instead.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom('brand as b')
   *   .select(['b.id', 'b.name'])
   *   .where('b.created_at', '<', new Date())
   *   .orderBy('b.name', 'desc');
   *
   * const result = await ds.query(query, { name: 'getBrands' });
   * const { data, error, meta } = result;
   *
   * if (error) {
   *   // error: QError, data: undefined
   *   console.error(error.message, error.cause);
   *   return;
   * }
   * // data is narrowed to the selected rows (ie: { id: number; name: string }[])
   * console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   *
   * // Optionally: map over the rows (a failing mapper returns an error result)
   * const { data: brands } = result.map((row) => {
   *   return { ...row, key: `key-${row.id}` };
   * });
   *
   * // Send the result to a client, the error cause (driver internals) is left out
   * return Response.json(result.toJsonifiable());
   * ```
   */
  query = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions
  ): AsyncQResult<TData> => {
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
          this.defaultOptions.query?.inflightQueryAbortStrategy,
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

      // Report an aborted query with the abort reason as cause, whatever
      // the dialect threw
      const signal = options?.signal;
      const aborted = signal?.aborted === true;
      return createQResultError(
        {
          message,
          code: aborted ? "ABORTED" : "QUERY_FAILED",
          cause: aborted ? signal.reason : error,
        },
        new QMeta({
          name,
          spans: span,
        })
      );
    }
  };

  /**
   * Run a query and return the rows directly, or throw when it fails.
   *
   * Throws a `QErrors.QueryFailed` (message prefixed with "Query failed: ",
   * the driver error as `cause`), or a `QErrors.Aborted` when aborted with
   * `signal` (the abort reason as `cause`). To throw your own error, pass
   * an `onError` factory, per query or for the whole datasource with the
   * `defaultOptions.queryOrThrow` param.
   *
   * Use `query()` to handle errors without try/catch.
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder.selectFrom('brand as b').select(['b.id', 'b.name']);
   * try {
   *   const { data, meta } = await ds.queryOrThrow(query);
   *   console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   * } catch (e) {
   *   // ie: "Query failed: Invalid object name 'brand'."
   *   console.error(e);
   * }
   * ```
   */
  queryOrThrow = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions & QueryOrThrowOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TQuery, TData>(query, options);
    return {
      data: result.getOrThrow({
        onError: options?.onError ?? this.defaultOptions.queryOrThrow?.onError,
      }),
      meta: result.meta,
    };
  };

  /**
   * Run a query expecting at most one row and return a QResult holding the
   * row, or null when the query returns no row. Like `query()`, it never
   * throws and checking `error` narrows `data`.
   *
   * When the query returns more than one row, the result is an error with
   * `code` "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as `cause`
   * (query failures: "QUERY_FAILED" or "ABORTED").
   *
   * Check `error` before falling back on `data` (ie: `data ?? fallback`): on
   * error, `data` is undefined and the fallback would hide the failure. For
   * a one-liner, prefer `queryOneOrThrow(query, { defaultValue })`.
   *
   * More than one row is logged as a warning, no row at debug level (often
   * an expected outcome). Also applies to `queryOneOrThrow()`.
   *
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `.limit(2)`, `.top(2)` on SQL Server).
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom("brand as b")
   *   .select(["b.id", "b.name"])
   *   .where("b.id", "=", id);
   *
   * const { data: brand, error } = await ds.queryOne(query);
   * if (error) {
   *   // query failure or more than one row
   *   throw new Error(error.message, { cause: error.cause });
   * }
   * if (brand === null) {
   *   // not found, ie: return a 404
   * }
   * ```
   */
  queryOne = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions
  ): AsyncQResult<TData[number] | null> => {
    const result = await this.query<TQuery, TData>(query, options);
    if (result.error === undefined) {
      this.logRowCount(result.meta, result.data.length);
    }
    return toOneRowQResult(result);
  };

  /**
   * Run a query expecting exactly one row and return it.
   *
   * Throws when the query doesn't return exactly one row:
   * - no row: a `QErrors.NoResult`, unless a `defaultValue` is set (returned
   *   instead),
   * - more than one row: a `QErrors.TooManyResults` (with `rowCount`).
   *
   * Like `queryOrThrow()`, a query failure throws a `QErrors.QueryFailed`
   * (or a `QErrors.Aborted`).
   *
   * The errors can be replaced with `onNoResult` / `onTooManyResults` /
   * `onError` (query failures) factories, per query or for the whole
   * datasource with the `defaultOptions.queryOneOrThrow` param (per query
   * options win).
   * When the row might not exist, set a `defaultValue` or use `queryOne()`.
   *
   * Not to be confused with `(await ds.queryOne(query)).getOrThrow()`, which
   * returns null when there's no row (it throws the same errors otherwise)
   * and ignores the `defaultOptions.queryOneOrThrow` factories.
   *
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `.limit(2)`, `.top(2)` on SQL Server).
   *
   * @example
   * ```typescript
   * import { HttpNotFound } from "@httpx/exception";
   *
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom("brand as b")
   *   .select(["b.id", "b.name"])
   *   .where("b.id", "=", id);
   *
   * // Throws when there isn't exactly one row
   * const { data: row, meta } = await ds.queryOneOrThrow(query);
   *
   * // Or throw your own error (for the whole datasource: `defaultOptions.queryOneOrThrow`)
   * const { data: brand } = await ds.queryOneOrThrow(query, {
   *   onNoResult: ({ error }) =>
   *     new HttpNotFound({ message: `Brand ${id} not found`, cause: error }),
   * });
   *
   * // Or return a default value when there's no row
   * const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
   *   defaultValue: defaultSettings,
   * });
   * ```
   */
  queryOneOrThrow = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
    TDefault = never,
  >(
    query: TQuery,
    options?: KyselyQueryOptions & QueryOneOrThrowOptions<TDefault>
  ): Promise<{
    data: TData[number] | TDefault;
    meta: QMeta;
  }> => {
    const result = await this.queryOne<TQuery, TData>(query, options);
    return {
      data: getOneRowOrThrow(
        result,
        options,
        this.defaultOptions.queryOneOrThrow
      ),
      meta: result.meta,
    };
  };

  /**
   * Stream the rows of a query, one row at a time, rather than loading
   * the whole result in memory.
   *
   * Rows are read from the database in chunks of `chunkSize` rows (support
   * depends on the dialect). Breaking or returning before the stream has
   * ended is supported and releases the database connection.
   *
   * Unlike `query()`, errors are thrown while iterating: a `QErrors.QueryFailed`,
   * or a `QErrors.Aborted` when aborted with `signal`. Only query builders
   * can be streamed, raw `sql` queries throw.
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom('brand as b')
   *   .select(['b.id', 'b.name'])
   *   .orderBy('b.name', 'desc');
   *
   * const stream = ds.stream(query, { chunkSize: 1000 });
   * for await (const brand of stream) {
   *   console.log(brand.name);
   *   if (brand.name === 'Something') {
   *     break;
   *   }
   * }
   * ```
   *
   * @yields Each row of the query result as it is streamed.
   * @throws QErrors.QueryFailed with the driver error as cause when the query fails, QErrors.Aborted with the abort reason as cause when aborted.
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

      if (signal?.aborted === true) {
        // oxlint-disable-next-line preserve-caught-error -- the abort reason is the intended cause
        throw new QErrors.Aborted(message, { cause: signal.reason });
      }
      throw new QErrors.QueryFailed(message, { cause: error });
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

  /**
   * Log the `queryOne()` row count when it isn't one: more than one row as
   * a warning (missing condition or broken data integrity), no row at debug
   * level as it's often an expected outcome (ie: not found).
   */
  private readonly logRowCount = (meta: QMeta, rowCount: number): void => {
    const [span] = meta.getSpansByType("sql");
    if (rowCount === 1 || span === undefined) {
      return;
    }
    const properties = {
      ...this.getLogFromSpan(meta.name ?? "anonymous", span, "queryOne"),
      rowCount,
    };
    if (rowCount > 1) {
      this.logger.warn(
        'Query "{queryName}" expected one row, received {rowCount}',
        properties
      );
    } else {
      this.logger.debug('Query "{queryName}" returned no row', properties);
    }
  };

  private readonly getLogFromSpan = (
    queryName: string,
    span: QMetaSqlSpan,
    method: "query" | "queryOne" | "stream"
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
