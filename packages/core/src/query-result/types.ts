import type { QResult } from './q-result';

export interface QError {
  message: string;
}

export type AsyncQResult<
  TData extends unknown[] | undefined,
  TError extends QError | undefined = undefined,
> = Promise<QResult<TData, TError>>;
