import type { QResult } from './q-result';
import type { AsyncQResult } from './types';

export type InferQResult<T> =
  T extends AsyncQResult<infer AsyncData, infer _AsyncErr>
    ? NonNullable<AsyncData>[number][]
    : T extends QResult<infer Data, infer _Err>
      ? NonNullable<Data>[number][]
      : never;
