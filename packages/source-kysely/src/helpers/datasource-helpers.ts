import type { QError, QMeta, QResult } from "@flowblade/core";

export type JsonifiedDataSourceResponse<T extends QResult<unknown[], QError>> =
  {
    data?: T["data"];
    error?: QError;
    meta: QMeta;
  };

export const DatasourceHelpers = {
  toJsonified: <T extends QResult<unknown[], QError>>(queryResponse: T) =>
    queryResponse as JsonifiedDataSourceResponse<T>,
};
