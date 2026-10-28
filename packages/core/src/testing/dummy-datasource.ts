import type { SqlTag } from "@flowblade/sql-tag";

import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  getOneRowOrThrow,
  toOneRowQResult,
} from "../data-source/index";
import {
  type AsyncQResult,
  type DatasourceInterface,
  type QError,
  QMeta,
  type DatasourceDefaultOptions,
  type QResult,
  type QueryOneOrThrowOptions,
  type QueryOptions,
  type QueryOrThrowOptions,
  type QueryStreamOptions,
} from "../index";

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

type DummyDatasourceParams = {
  connection: VoluntaryAny;
  /**
   * Default options, keyed by method name (ie: `queryOneOrThrow` errors).
   */
  defaultOptions?: DatasourceDefaultOptions;
};

/**
 * @internal
 */
export class DummyDatasource implements DatasourceInterface {
  private readonly db: VoluntaryAny;
  private readonly defaultOptions: DatasourceDefaultOptions;

  constructor(params: DummyDatasourceParams) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.db = params.connection;
    this.defaultOptions = params.defaultOptions ?? {};
  }

  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): VoluntaryAny => this.db;

  /**
   * Run a raw query on the datasource and return a query result (QResult).
   *
   * @example
   * ```typescript
   * import { DuckdbDatasource } from '@flowblade/source-duckdb';
   * import { sql } from '@flowblade/sql-tag';
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * const rawSql = sql<{productId: number}>`
   *   WITH products(productId) AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
   *   SELECT productId FROM products
   *   WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER
   * `;
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
   *    id: row.productId,
   *    key: `key-${row.productId}`
   * })
   * ```
   */
  query = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData>,
    options?: QueryOptions
  ): AsyncQResult<TData> => {
    const { name } = options ?? {};
    const { text: sql, values: params } = rawQuery;
    const meta = createSqlSpan({ sql, params });
    const start = Date.now();
    try {
      const rows = [] as VoluntaryAny[];
      meta.affectedRows = 0;
      meta.timeMs = Date.now() - start;
      return createQResultSuccess(
        rows as TData,
        new QMeta({ name, spans: meta })
      );
    } catch (error) {
      meta.timeMs = Date.now() - start;
      return createQResultError(
        {
          message: (error as Error).message,
          code: "QUERY_FAILED",
          cause: error,
        },
        new QMeta({
          name,
          spans: meta,
        })
      );
    }
  };

  /**
   * Run the query or throw on error
   *
   * @example
   * ```typescript
   * const ds = new DummyDatasource();
   * try {
   *  const { data, meta } = await ds.query('select 1');
   * } catch (e) {
   *   //
   * }
   * ```
   */
  queryOrThrow = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData>,
    options?: QueryOrThrowOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TData>(rawQuery, options);
    return {
      data: result.getOrThrow({
        onError: options?.onError ?? this.defaultOptions.queryOrThrow?.onError,
      }),
      meta: result.meta,
    };
  };

  /**
   * Run a query expecting at most one row and return a QResult holding
   * the row, or null when the query returns no row.
   *
   * When the query returns more than one row, the result is an error with
   * `code` "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as `cause`.
   *
   * Check `error` before falling back on `data` (ie: `data ?? fallback`): on
   * error, `data` is undefined and the fallback would hide the failure. For
   * a one-liner, prefer `queryOneOrThrow(query, { defaultValue })`.
   *
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `LIMIT 2`, `TOP 2` on SQL Server).
   *
   * @example
   * ```typescript
   * const ds = new DummyDatasource();
   * const { data: row, error } = await ds.queryOne(sql`select 1 as id`);
   * if (error) {
   *   // query failure or more than one row
   *   throw new Error(error.message, { cause: error.cause });
   * }
   * if (row === null) {
   *   // not found, ie: return a 404
   * }
   * ```
   */
  queryOne = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData>,
    options?: QueryOptions
  ): AsyncQResult<TData[number] | null> =>
    toOneRowQResult(await this.query<TData>(rawQuery, options));

  /**
   * Run a query expecting exactly one row and return it.
   *
   * Throws a `QErrors.NoResult` when the query returns no row (unless a
   * `defaultValue` is set), a `QErrors.TooManyResults` when it returns more
   * than one and an Error when the query fails. The row count errors can be
   * replaced with `onNoResult` / `onTooManyResults` factories, per query or
   * with the `defaultOptions.queryOneOrThrow` param.
   *
   * @example
   * ```typescript
   * const ds = new DummyDatasource();
   * const { data: row, meta } = await ds.queryOneOrThrow(sql`select 1 as id`);
   * ```
   */
  queryOneOrThrow = async <TData extends unknown[], TDefault = never>(
    rawQuery: SqlTag<TData>,
    options?: QueryOneOrThrowOptions<TDefault>
  ): Promise<{
    data: TData[number] | TDefault;
    meta: QMeta;
  }> => {
    const result = await this.queryOne<TData>(rawQuery, options);
    return {
      data: getOneRowOrThrow(
        result,
        options,
        this.defaultOptions.queryOneOrThrow
      ),
      meta: result.meta,
    };
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream(
    _query: Parameters<DatasourceInterface["stream"]>[0],
    _options?: QueryStreamOptions
  ): AsyncIterableIterator<QResult<unknown[], QError>> {
    throw new Error("Not implemented yet");
  }
}
