import { Result } from 'typescript-result';

import { QMeta, type QMetaJsonifiable } from '../meta/q-meta';
import type { QError } from './types';

interface ConstructorParams<
  TData extends unknown[] | undefined,
  TError extends QError | undefined,
> {
  meta?: QMeta;
  data?: TData;
  error?: TError;
}

export type QResultJsonifiable<
  TData extends unknown[] | undefined,
  TError extends QError | undefined,
> = {
  data?: TData;
  error?: TError;
  meta: QMetaJsonifiable;
};

export class QResult<
  TData extends unknown[] | undefined,
  TError extends QError | undefined,
> {
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

  #meta: QMeta;

  #innerResult:
    | Result.Ok<{
        rows: TData;
        meta: QMeta;
      }>
    | Result.Error<TError>;

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
        name: 'default',
      });

    this.#innerResult =
      params.error === undefined
        ? Result.ok({
            meta: this.#meta,
            rows: params.data!,
          })
        : Result.error(params.error);
  }

  /**
   * Return meta information about the query result.
   *
   * This generally includes the query execution time,
   * affected rows, and other metadata.
   *
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
  isError = (): boolean => {
    return this.#innerResult.isError();
  };

  /**
   * Transforms the value of a successful result using the transform callback.
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
   * // QResult<{ name: number; capitalized: string }[] | undefined, QError | undefined>
   *
   * // 👇 A new span of type 'map' will be appended to the meta, allowing
   * //    access to performance metrics
   *
   * console.log(newResult.meta.getLatestSpan()); // { type: 'map', timeMs: 10 }
   *
   * ```
   */
  map = <TMappedRow extends Record<string, unknown>>(
    transformFn: (row: NonNullable<TData>[number]) => TMappedRow
  ): QResult<TMappedRow[] | undefined, TError | undefined> => {
    const start = Date.now();
    if (this.#innerResult.isOk()) {
      let returned: TMappedRow[] | undefined;
      let err: QError | undefined;
      try {
        returned = this.#innerResult.value.rows!.map((row) => transformFn(row));
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
              ? e
              : 'mapper: unknown error';
        err = {
          message,
        };
      }
      const meta = this.#meta.withSpan({
        type: 'map',
        timeMs: Date.now() - start,
      });
      if (err === undefined) {
        return new QResult<TMappedRow[], undefined>({
          data: returned,
          meta,
          error: undefined,
        });
      }
      return new QResult<undefined, TError>({
        data: undefined,
        meta,
        error: err as TError,
      });
    }
    return new QResult<undefined, TError>({
      data: undefined,
      meta: this.#meta,
      error: this.#innerResult.error,
    });
  };

  /**
   * Get (unwrap) the success value or throw an error with the QError message.
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
        ? new Error(this.error.message)
        : customErrorFn(this.error);
    }
    return this.data!;
  };

  /**
   * Transforms the result into a JSON-serializable object with `data`, `error`, and `meta`.
   *
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
    return {
      ...(this.data === undefined ? {} : { data: this.data }),
      ...(this.error === undefined ? {} : { error: this.error }),
      meta: this.meta.toJSON(),
    };
  };
}
