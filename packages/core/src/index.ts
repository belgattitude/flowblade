export {
  assertQueryResultError,
  assertQueryResultSuccess,
  isQueryResultError,
  isQueryResultSuccess,
} from './data-source/assert';
export type {
  DatasourceInterface,
  DatasourceQueryInfo,
} from './data-source/datasource.interface';
export type {
  AsyncQueryResult,
  InferAsyncQueryResultData,
  InferQueryResultData,
  QueryResult,
  QueryResultError,
  QueryResultMeta,
  QueryResultSuccess,
} from './data-source/query-result';
export {
  createResultError,
  createResultSuccess,
} from './data-source/query-result-factories';