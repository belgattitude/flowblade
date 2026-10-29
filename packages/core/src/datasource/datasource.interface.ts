import type {
  QErrorFactory,
  QOneRowErrorFactories,
  QOneRowNoResultOptions,
} from "../errors/q-error-factories";
import type { QMeta } from "../meta/q-meta";
import type { AsyncQResult } from "../query-result/types";

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface QueryOptions {
  /**
   * Name used to label your query, useful for logging and/or debugging.
   * Defaults to "anonymous" in the datasources.
   */
  name?: string;
  /**
   * Abort the query, support depends on the datasource.
   */
  signal?: AbortSignal;
}

export type QueryStreamOptions = QueryOptions & {
  /**
   * Number of rows to read per chunk from the database, support depends
   * on the datasource (ie: ignored by DuckDB, which uses its own chunk size).
   */
  chunkSize?: number;
};

/**
 * Options of `queryOrThrow()`: `onError` overrides the datasource default
 * (`defaultOptions.queryOrThrow` param).
 */
export type QueryOrThrowOptions = QueryOptions & {
  /**
   * Create the error thrown when the query fails, rather than a
   * `QErrors.QueryFailed` / `QErrors.Aborted` (received as `error`).
   */
  onError?: QErrorFactory;
};

/**
 * Options of `queryOneOrThrow()`: the error factories override the
 * datasource defaults (`defaultOptions.queryOneOrThrow` param),
 * `defaultValue` is returned rather than throwing when there's no row.
 */
export type QueryOneOrThrowOptions<TDefault = never> = QueryOptions &
  Pick<QOneRowErrorFactories, "onError" | "onTooManyResults"> &
  QOneRowNoResultOptions<TDefault>;

/**
 * Datasource level default options, keyed by method name. Only the named
 * method uses them, and the options passed per query win.
 *
 * @example
 * ```typescript
 * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
 *
 * const defaultOptions: DatasourceDefaultOptions = {
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
 * };
 * ```
 */
export type DatasourceDefaultOptions = {
  /**
   * Default error factory of `queryOrThrow()`, used when the query fails.
   */
  queryOrThrow?: Pick<QueryOrThrowOptions, "onError">;
  /**
   * Default error factories of `queryOneOrThrow()`, used when the query
   * fails (`onError`) or doesn't return exactly one row.
   */
  queryOneOrThrow?: QOneRowErrorFactories;
};

/**
 * Contract implemented by the flowblade datasources (ie: DuckdbDatasource,
 * KyselyDatasource).
 *
 * Two families of methods are available:
 *
 * - `query()` and `queryOne()` never throw, they return a QResult holding
 *   either `data` or `error`. An empty result isn't an error: `query()`
 *   returns `[]` and `queryOne()` returns null.
 * - `queryOrThrow()` and `queryOneOrThrow()` return the data directly and
 *   throw on error (`QErrors`). `queryOneOrThrow()` also throws when
 *   there's no row, unless a `defaultValue` is set. The thrown errors can
 *   be replaced with error factories (ie: `onError`), per query or with
 *   the datasource `defaultOptions`.
 *
 * `queryOne()` and `queryOneOrThrow()` expect at most one row: more than one
 * is always an error, protecting against a missing condition or broken
 * data integrity.
 *
 * `stream()` iterates over the rows without loading them all in memory.
 */
export interface DatasourceInterface {
  /**
   * Return the underlying driver connection (ie: the DuckDB connection or
   * the Kysely instance).
   *
   * Warning: using the underlying driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection: () => VoluntaryAny;

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
   * Use `queryOrThrow()` to get the rows directly and throw on error instead.
   *
   * @example
   * ```typescript
   * const ds = new XXDatasource();
   * const result = await ds.query('select id, name from product');
   * const { data, error, meta } = result;
   *
   * if (error) {
   *   // error: QError, data: undefined
   *   console.error(error.message, error.cause);
   *   return;
   * }
   * // data is narrowed to the rows
   * console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   *
   * // Send the result to a client, the error cause (driver internals) is left out
   * return Response.json(result.toJsonifiable());
   * ```
   */
  query: (
    query: VoluntaryAny,
    options?: QueryOptions
  ) => AsyncQResult<VoluntaryAny, VoluntaryAny>;

  /**
   * Run a query and return the rows directly, or throw when it fails.
   *
   * Throws a `QErrors.QueryFailed` (message prefixed with "Query failed: ",
   * the driver error as `cause`), or a `QErrors.Aborted` when aborted with
   * `signal` (the abort reason as `cause`).
   *
   * To throw your own error, pass an `onError` factory, per query or for
   * the whole datasource with the `defaultOptions.queryOrThrow` param.
   *
   * Use `query()` to handle errors without try/catch.
   *
   * @example
   * ```typescript
   * import { HttpServiceUnavailable } from "@httpx/exception";
   *
   * const ds = new XXDatasource();
   * const { data } = await ds.queryOrThrow(query, {
   *   onError: ({ error, qError }) =>
   *     new HttpServiceUnavailable({ message: qError.message, cause: error }),
   * });
   *
   * try {
   *   const { data, meta } = await ds.queryOrThrow('select id, name from product');
   *   console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   * } catch (e) {
   *   // ie: "Query failed: Catalog Error: Table with name product does not exist!"
   *   console.error(e);
   * }
   * ```
   */
  queryOrThrow: (
    query: VoluntaryAny,
    options?: QueryOrThrowOptions
  ) => Promise<{
    data: VoluntaryAny;
    meta: QMeta;
  }>;

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
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `LIMIT 2`, `TOP 2` on SQL Server).
   *
   * @example
   * ```typescript
   * const ds = new XXDatasource();
   * const { data: product, error } = await ds.queryOne(query);
   * if (error) {
   *   // query failure or more than one row
   *   throw new Error(error.message, { cause: error.cause });
   * }
   * if (product === null) {
   *   // not found, ie: return a 404
   * }
   * ```
   */
  queryOne: (
    query: VoluntaryAny,
    options?: QueryOptions
  ) => AsyncQResult<VoluntaryAny, VoluntaryAny>;

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
   * key, bound it to 2 rows (ie: `LIMIT 2`, `TOP 2` on SQL Server).
   *
   * @example
   * ```typescript
   * import { HttpNotFound } from "@httpx/exception";
   *
   * const ds = new XXDatasource();
   * // Throws when there isn't exactly one row
   * const { data: row, meta } = await ds.queryOneOrThrow('select 1 as id');
   *
   * // Or throw your own error (for the whole datasource: `defaultOptions.queryOneOrThrow`)
   * const { data: product } = await ds.queryOneOrThrow(query, {
   *   onNoResult: ({ error }) =>
   *     new HttpNotFound({ message: `Product ${id} not found`, cause: error }),
   * });
   *
   * // Or return a default value when there's no row
   * const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
   *   defaultValue: defaultSettings,
   * });
   * ```
   */
  queryOneOrThrow: (
    query: VoluntaryAny,
    options?: QueryOneOrThrowOptions<VoluntaryAny>
  ) => Promise<{
    data: VoluntaryAny;
    meta: QMeta;
  }>;

  /**
   * Stream the rows of a query, one row at a time, rather than loading
   * the whole result in memory.
   *
   * Rows are read from the database in chunks (see `chunkSize`, support
   * depends on the datasource). Breaking or returning before the stream
   * has ended is supported and releases the underlying resources.
   *
   * Unlike `query()`, errors are thrown while iterating: a `QErrors.QueryFailed`,
   * or a `QErrors.Aborted` when aborted with `signal`.
   *
   * @example
   * ```typescript
   * const ds = new XXDatasource();
   * const stream = ds.stream('select id from product', {
   *   chunkSize: 1000,
   * });
   * for await (const row of stream) {
   *   console.log(row.id);
   * }
   * ```
   */
  stream: (
    query: VoluntaryAny,
    options?: QueryStreamOptions
  ) => AsyncIterableIterator<VoluntaryAny>;
}
