import { type Err, type Ok, Result } from "better-result";

import { QMeta, type QMetaJsonifiable } from "../meta/q-meta";
import type { QError } from "./types";

/**
 * Shape of the result data, used by `map()`:
 * - "many": an array of rows (ie: `query()`)
 * - "one": a single row or null (ie: `queryOne()`)
 */
export type QResultShape = "many" | "one";

interface ConstructorParams<TData, TError extends QError | undefined> {
  meta?: QMeta;
  data?: TData;
  error?: TError;
  /**
   * Shape of the data. When omitted, it's "one" for a data that is neither
   * an array, null nor undefined, otherwise "many". Set "one" when the
   * data can be null.
   */
  shape?: QResultShape;
}

type InnerOkPayload<TData> = {
  rows: TData;
  meta: QMeta;
};

/**
 * Row type of the result data: the array item for "many" results,
 * the non-null row for "one" results.
 */
type QResultRow<TData> = TData extends readonly (infer TRow)[]
  ? TRow
  : Exclude<TData, null | undefined>;

/**
 * Data type after `map()`: an array for "many" results, the mapped row
 * (or null) for "one" results.
 */
type QResultMappedData<TData, TMappedRow> = TData extends readonly unknown[]
  ? TMappedRow[]
  : TData extends null | undefined
    ? TData
    : TMappedRow;

export type QResultJsonifiable<TData, TError extends QError | undefined> = {
  data?: TData;
  error?: TError;
  meta: QMetaJsonifiable;
};

class QResultImpl<TData, TError extends QError | undefined> {
  /**
   * Utility getter to infer the value type of the result.
   * Note: this getter does not hold any value, it's only used for type inference.
   */
  declare $inferData: TData;

  /**
   * Utility getter to infer the error type of the result.
   * Note: this getter does not hold any value, it's only used for type inference.
   */
  declare $inferError: TError;

  readonly #meta: QMeta;

  readonly #shape: QResultShape;

  readonly #innerResult:
    | Ok<InnerOkPayload<TData>, TError>
    | Err<InnerOkPayload<TData>, TError>;

  /**
   * Create a new QResult object.
   *
   * @example
   * ```typescript
   *  const initialSqlSpan: QMetaSqlSpan = {
   *    type: 'sql',
   *    timeMs: 13,
   *    sql: 'SELECT name FROM users',
   *    affectedRows: 10,
   *    params: [],
   *  };
   *
   *  type SuccessPayload = [{ name: string }];
   *
   *  // Example for a successful result
   *  const successResult = new QResult({
   *     data: [{ name: 'Seb' }],
   *     meta: new QMeta({
   *        spans: initialSqlSpan,
   *     }),
   *  });
   *
   *  // 👇 You can dereference, data, meta and error
   *
   *  const { data, meta, error } = result;
   *  if (data) {
   *    // typed in this case to SuccessPayload
   *    console.log(data); // [{ name: 'Seb' }]
   *  }
   *
   *  if (error) {
   *    // typed in this case to QError
   *    console.error(error); // QError object
   *  }
   *
   *  const failureResult = new QResult<SuccessPayload, QError>({
   *    error: {
   *       message: 'Error message',
   *    },
   *    meta: new QMeta({
   *       spans: initialSqlSpan,
   *    }),
   *  });
   *
   *  failureResult.isError()     // 👈 true
   *  failureResult.error         // 👈 QError
   *  failureResult.data          // 👈 undefined
   *
   *  // Helpers
   *
   *  failureResult.getOrThrow(); // 👈 throw Error('Error message')
   *
   *  // 👇 Customize the error and throws
   *  failureResult.getOrThrow((qErr) => {
   *    return new HttpServiceUnavailable({
   *      cause: new Error(qErr.message)
   *    })
   *  })
   * ```
   */
  constructor(params: ConstructorParams<TData, TError>) {
    this.#meta =
      params.meta ??
      new QMeta({
        name: "default",
      });
    const { data } = params;
    this.#shape =
      params.shape ??
      (data === undefined || data === null || Array.isArray(data)
        ? "many"
        : "one");

    this.#innerResult =
      params.error === undefined
        ? Result.ok({
            meta: this.#meta,
            rows: params.data as TData,
          })
        : Result.err(params.error);
  }

  /**
   * Return meta information about the query result.
   *
   * This generally includes the query execution time,
   * affected rows, and other metadata.
   *
   * @example
   * ```typescript
   *  const initialSqlSpan: QMetaSqlSpan = {
   *     type: 'sql',
   *     timeMs: 10.334,
   *     sql: 'SELECT name FROM users',
   *     affectedRows: 10,
   *     params: [],
   *   };
   *
   *  const result = new QResult({
   *     data: [{ name: 'Seb' }],
   *     meta: new QMeta({
   *        spans: initialSqlSpan,
   *     }),
   *  });
   *
   *  const { meta } = result;
   * ```
   */
  get meta(): QMeta {
    return this.#meta;
  }

  /**
   * Access the success data or undefined
   */
  get data(): TData | undefined {
    if (this.#innerResult.isOk()) {
      return this.#innerResult.value.rows;
    }
    return undefined;
  }

  /**
   * Access the error data or undefined
   */
  get error(): TError | undefined {
    if (this.#innerResult.isOk()) {
      return undefined;
    }
    return this.#innerResult.error;
  }

  /**
   * Check whether the result is a success
   */
  isOk(): boolean {
    return this.#innerResult.isOk();
  }

  /**
   * Check whether the result is an error
   */
  isError = (): boolean => this.#innerResult.isErr();

  /**
   * Transforms the rows of a successful result using the transform callback.
   *
   * For results holding an array of rows (ie: `query()`), each row is
   * transformed. For results holding a single row (ie: `queryOne()`), the row
   * is transformed and null is kept as is.
   *
   * The transform function will add a span to the metas to allow access to metrics
   *
   * Map transform is never applied on failure results.
   *
   * @example
   * ```typescript
   *  const result = new QResult({
   *     data: [{ name: 'Seb' }],
   *  });
   *
   *  const newResult = result.map((row) => {
   *    // In case of error you can throw
   *    return {
   *      name: row.name.length,
   *      capitalized: row.name.toUpperCase(),
   *    };
   * });
   *
   * // 👇 Type of the new result will properly be inferred as
   * // QResult<{ name: number; capitalized: string }[], QError>
   *
   * // 👇 A new span of type 'map' will be appended to the meta, allowing
   * //    access to performance metrics
   *
   * console.log(newResult.meta.getLatestSpan()); // { type: 'map', timeMs: 10 }
   *
   * // 👇 With a single row result, ie: QResult<{ name: string } | null, QError>
   * const { data } = (await ds.queryOne(query)).map((row) => ({
   *   capitalized: row.name.toUpperCase(),
   * }));
   * // data: { capitalized: string } | null
   * ```
   */
  map = <TMappedRow extends Record<string, unknown>>(
    transformFn: (row: QResultRow<TData>) => TMappedRow
  ): QResult<QResultMappedData<TData, TMappedRow>, TError | QError> => {
    type TMappedData = QResultMappedData<TData, TMappedRow>;
    const start = Date.now();
    const shape = this.#shape;
    if (this.#innerResult.isOk()) {
      let returned: unknown;
      let err: QError | undefined;
      const { rows } = this.#innerResult.value;
      try {
        if (shape === "one") {
          returned =
            rows === null || rows === undefined
              ? rows
              : transformFn(rows as QResultRow<TData>);
        } else {
          if (!Array.isArray(rows)) {
            throw new TypeError(
              `QResult.map(): expected data to be an array of rows, received ${rows === null ? "null" : typeof rows}`
            );
          }
          returned = rows.map((row: QResultRow<TData>) => transformFn(row));
        }
      } catch (error) {
        let message: string;
        if (error instanceof Error) {
          ({ message } = error);
        } else if (typeof error === "string") {
          message = error;
        } else {
          message = "mapper: unknown error";
        }
        err = {
          message,
          cause: error,
        };
      }
      const meta = this.#meta.withSpan({
        type: "map",
        timeMs: Date.now() - start,
      });
      if (err === undefined) {
        return new QResultImpl<TMappedData, TError | QError>({
          data: returned as TMappedData,
          meta,
          shape,
        }) as QResult<TMappedData, TError | QError>;
      }
      return new QResultImpl<TMappedData, TError | QError>({
        meta,
        error: err,
        shape,
      }) as QResult<TMappedData, TError | QError>;
    }
    return new QResultImpl<TMappedData, TError | QError>({
      meta: this.#meta,
      error: this.#innerResult.error,
      shape,
    }) as QResult<TMappedData, TError | QError>;
  };

  /**
   * Get (unwrap) the success value or throw an error with the QError message
   * (and the QError cause as error cause).
   *
   * @example
   * ```typescript
   *  const failureResult = new QResult<SuccessPayload, QError>({
   *    error: {
   *       message: 'Error message',
   *    },
   *  });
   *
   *  failureResult.getOrThrow(); // 👈 throw Error('Error message')
   *
   *  // 👇 Customize the error and throws
   *  failureResult.getOrThrow((qErr) => {
   *    return new HttpServiceUnavailable({
   *      cause: new Error(qErr.message)
   *    })
   *  })
   * ```
   *
   * @throws Error if the result is a failure
   */
  getOrThrow = (customErrorFn?: (qError: QError) => Error): TData => {
    if (this.error !== undefined) {
      throw customErrorFn === undefined
        ? new Error(this.error.message, { cause: this.error.cause })
        : customErrorFn(this.error);
    }
    return this.data as TData;
  };

  /**
   * Transforms the result into a JSON-serializable object with `data`, `error`, and `meta`.
   *
   * @example
   * ```typescript
   *  const initialSqlSpan: QMetaSqlSpan = {
   *     type: 'sql',
   *     timeMs: 15,
   *     sql: 'SELECT name FROM users',
   *     affectedRows: 10,
   *     params: [],
   *   };
   *
   *  const result = new QResult({
   *     data: [{ name: 'Seb' }],
   *     meta: new QMeta({
   *        spans: initialSqlSpan,
   *     }),
   *  });
   *  const jsonifiable = result.toJsonifiable();
   * ```
   */
  toJsonifiable = (): QResultJsonifiable<TData, TError> => {
    const json: QResultJsonifiable<TData, TError> = {
      meta: this.meta.toJSON(),
    };
    if (this.data !== undefined) {
      json.data = this.data;
    }
    if (this.error !== undefined) {
      // The cause (ie: driver error) isn't serializable and might leak internals
      const { cause: _cause, ...error } = this.error;
      json.error = error as TError;
    }
    return json;
  };
}

type QResultOk<TData> = {
  readonly data: TData;
  readonly error: undefined;
};

type QResultErr<TError> = {
  readonly data: undefined;
  readonly error: TError;
};

/**
 * Result of a query, either a success holding `data` or a failure holding `error`.
 *
 * `data` holds the rows (ie: `query()` returns `QResult<Row[], QError>`) or,
 * for single row queries, the row or null (ie: `queryOne()` returns
 * `QResult<Row | null, QError>`).
 *
 * It's a discriminated union: checking `error` narrows `data`, even
 * after destructuring.
 *
 * @example
 * ```typescript
 * const { data, error, meta } = await ds.query(sql<{ id: number }>`SELECT 1 as id`);
 * if (error) {
 *   // error: QError, data: undefined
 *   return console.error(error.message);
 * }
 * // data: { id: number }[]
 * ```
 */
// The QResult type and value (constructor) share the same name, like a class
// oxlint-disable-next-line no-redeclare
export type QResult<TData, TError extends QError | undefined> = QResultImpl<
  TData,
  TError
> &
  ([NonNullable<TError>] extends [never]
    ? QResultOk<TData>
    : QResultOk<TData> | QResultErr<NonNullable<TError>>);

type QResultConstructor = new <TData, TError extends QError | undefined>(
  params: ConstructorParams<TData, TError>
) => QResult<TData, TError>;

export const QResult = QResultImpl as unknown as QResultConstructor;
