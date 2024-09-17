import type { Jsonify } from 'type-fest';

import type { DataSourceExecutorResponse } from '../executor/IDataSourceExecutor';

export type JsonifiedDataSourceResponse<
  T extends DataSourceExecutorResponse<Record<string, unknown>[]>,
> = { data: Jsonify<T['data']>; meta: T['meta'] };

export const DataSourceHelpers = {
  toJsonified: <
    T extends DataSourceExecutorResponse<Record<string, unknown>[]>,
  >(
    queryResponse: T
  ) => {
    return queryResponse as unknown as JsonifiedDataSourceResponse<T>;
  },
};
