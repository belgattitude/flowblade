import type { Jsonify } from 'type-fest';

import type { DatasourceExecutorSuccess } from '../datasource/datasource.interface';

export type JsonifiedDataSourceResponse<
  T extends DatasourceExecutorSuccess<Record<string, unknown>[]>,
> = { data: Jsonify<T['data']>; meta: T['meta'] };

export const DatasourceHelpers = {
  toJsonified: <T extends DatasourceExecutorSuccess<Record<string, unknown>[]>>(
    queryResponse: T
  ) => {
    return queryResponse as unknown as JsonifiedDataSourceResponse<T>;
  },
};
