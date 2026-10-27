import type {
  QOneRowErrorFactories,
  QOneRowNoResultOptions,
} from "../errors/q-one-row-error-factories";
import type { QMeta } from "../meta/q-meta";
import type { QResult } from "../query-result/q-result";

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
 * Options of `queryOneOrThrow()`: the error factories override the
 * datasource defaults (`errors` param), `defaultValue` is returned rather
 * than throwing when there's no row.
 */
export type QueryOneOrThrowOptions<TDefault = never> = QueryOptions &
  Pick<QOneRowErrorFactories, "onTooManyResults"> &
  QOneRowNoResultOptions<TDefault>;

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
 *   throw on error. `queryOneOrThrow()` also throws when there's no row.
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
   * It never throws: when the query fails, `error` holds a QError (message and
   * the original driver error as `cause`) and `data` is undefined. `meta` is
   * always present (sql, params, timing, affected rows...).
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
  ) => Promise<QResult<VoluntaryAny, VoluntaryAny>>;

  /**
   * Run a query and return the rows directly, or throw when it fails.
   *
   * The thrown Error message is prefixed with "Query failed: " and its
   * `cause` holds the original driver error.
   *
   * Use `query()` to handle errors without try/catch.
   *
   * @example
   * ```typescript
   * const ds = new XXDatasource();
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
    options?: QueryOptions
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
   * `code` "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as `cause`.
   *
   * Check `error` before falling back on `data` (ie: `data ?? fallback`): on
   * error, `data` is undefined and the fallback would hide the failure. For
   * a one-liner, prefer `queryOneOrThrow(query, { defaultValue })`.
   * Query failures have no `code`.
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
  ) => Promise<QResult<VoluntaryAny, VoluntaryAny>>;

  /**
   * Run a query expecting exactly one row and return it.
   *
   * Throws a `QErrors.NoResult` when the query returns no row, a `QErrors.TooManyResults`
   * when it returns more than one and, like `queryOrThrow()`, an Error with
   * the driver error as `cause` when the query fails.
   *
   * Use it when the row must exist. The thrown errors can be replaced with
   * `onNoResult` / `onTooManyResults` factories, per query or as datasource
   * defaults (`errors` param). When the row might not exist, set a
   * `defaultValue` (returned rather than throwing when there's no row) or
   * use `queryOne()`.
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
   * // Or throw your own error
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
   * Unlike `query()`, errors are thrown while iterating.
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
