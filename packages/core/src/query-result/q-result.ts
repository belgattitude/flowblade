import { Result } from 'typescript-result';

import type { QMeta, QMetaJsonifiable } from '../meta/q-meta';
import type { QError } from './types';

interface ConstructorParams<
  TData extends unknown[] | undefined,
  TError extends QError | undefined,
> {
  meta: QMeta;
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

  private _result: Result<
    {
      rows: TData;
      meta: QMeta;
    },
    TError
  >;

  /**
   * Create a new QResult instance.
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
   *  const { data, meta, error } = result;
   *  if (data) {
   *    // typed in this case to { name: string }[]
   *    console.log(data); // [{ name: 'Seb' }]
   *  }
   *
   *  if (error) {
   *    // typed in this case to QError
   *    console.error(error); // QError object
   *  }
   *
   *  const errorResult = new QResult<{ name: string }[], QError>({
   *    error: {
   *       message: 'error',
   *    },
   *    meta: new QMeta({
   *       spans: initialSqlSpan,
   *    }),
   *  });
   *
   * ```
   */
  constructor(private params: ConstructorParams<TData, TError>) {
    const { data, error, meta } = this.params;
    this._result =
      error === undefined
        ? Result.ok({
            meta: meta,
            rows: data!,
          })
        : Result.error(error);
  }

  /**
   * Return meta information about the query result.
   *
   * This generally includes the query execution time,
   * affected rows, and other metadata.
   *
   * ```typescript
   *
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
    return this.params.meta;
  }

  get data(): TData | undefined {
    if (this._result.isOk()) {
      return this._result.value.rows;
    }
    return undefined;
  }

  get error(): TError | undefined {
    if (this._result.isOk()) {
      return undefined;
    }
    return this._result.error;
  }

  isOk(): boolean {
    return this._result.isOk();
  }

  map<TMappedRow extends Record<string, unknown>>(
    fn: (row: NonNullable<TData>[number]) => TMappedRow
  ): QResult<TMappedRow[] | undefined, TError | undefined> {
    const start = performance.now();
    if (this._result.isOk()) {
      const result = this._result.map((value) => {
        return {
          meta: this.params.meta,
          rows: value.rows!.map((row) => fn(row)),
        };
      });
      return new QResult<typeof result.value.rows, undefined>({
        data: result.value.rows,
        meta: this.params.meta.withSpan({
          type: 'map',
          timeMs: performance.now() - start,
        }),
        error: undefined,
      });
    }
    return new QResult<undefined, TError>({
      data: undefined,
      meta: this.params.meta,
      error: this.params.error,
    });
  }

  /**
   * Transforms the result into a JSON-serializable object with `data`, `error`, and `meta`.
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
   *  const jsonifiable = result.toJsonifiable();
   * ```
   *
   */
  toJsonifiable(): QResultJsonifiable<TData, TError> {
    return {
      ...(this.data === undefined ? {} : { data: this.data }),
      ...(this.error === undefined ? {} : { error: this.error }),
      meta: this.meta.toJSON(),
    };
  }
}
