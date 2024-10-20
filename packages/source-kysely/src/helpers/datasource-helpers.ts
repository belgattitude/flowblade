import type { Jsonify } from 'type-fest';

import type { DatasourceResult } from '../core/datasource-result';

export type JsonifiedDataSourceResponse<
  T extends DatasourceResult<Record<string, unknown>[]>,
> = { data: Jsonify<T['data']>; meta: T['meta'] };

export const DatasourceHelpers = {
  toJsonified: <T extends DatasourceResult<Record<string, unknown>[]>>(
    queryResponse: T
  ) => {
    return queryResponse as unknown as JsonifiedDataSourceResponse<T>;
  },
};
