import type { QMeta, QMetaSqlSpan } from '../meta/q-meta';
import { type QError, QResult } from '../query-result/q-result';

/**
 * Create a new SQL span with sql query + params and initial timeMs: 0, affectedRows: 0.
 */
export const createSqlSpan = ({
  sql,
  params,
  timeMs,
  affectedRows,
}: {
  sql: QMetaSqlSpan['sql'];
  params: QMetaSqlSpan['params'];
  timeMs?: number;
  affectedRows?: number;
}): QMetaSqlSpan => {
  return {
    type: 'sql',
    sql,
    params,
    timeMs: timeMs ?? 0,
    affectedRows: affectedRows ?? 0,
  };
};

export const createQResultSuccess = <T extends unknown[]>(
  data: T,
  meta: QMeta
): QResult<T, never> => {
  return new QResult({
    meta,
    data,
  });
};

export const createQResultError = (
  error: QError,
  meta: QMeta
): QResult<never, QError> => {
  return new QResult({
    meta,
    error,
  });
};
