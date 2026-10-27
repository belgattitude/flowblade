type InferData<T> = T extends { $inferData: infer TData }
  ? Exclude<TData, undefined>
  : never;

/**
 * Infer the data type of a QResult (or a promise of it): the rows for
 * `query()` results (ie: `Row[]`), the row or null for `queryOne()`
 * results (ie: `Row | null`).
 */
export type InferQResult<T> =
  T extends Promise<infer TResult> ? InferData<TResult> : InferData<T>;
