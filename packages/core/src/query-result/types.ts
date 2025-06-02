import type { QResult } from './q-result';

export type QError = {
  message: string;
};

export type AsyncQResult<
  TData extends unknown[],
  TError extends QError | undefined = QError,
> = Promise<QResult<TData, TError>>;
