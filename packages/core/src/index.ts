export type {
  DatasourceDefaultOptions,
  DatasourceInterface,
  QueryOneOrThrowOptions,
  QueryOptions,
  QueryOrThrowOptions,
  QueryStreamOptions,
} from "./data-source/datasource.interface";
/**
 * Errors thrown by flowblade (ie: `QErrors.NoResult`, `QErrors.TooManyResults`),
 * usable with `instanceof` and as types.
 */
export * as QErrors from "./errors/index";
export type {
  QErrorFactory,
  QGetOrThrowErrorFactories,
  QNoResultErrorFactory,
  QOneRowErrorFactories,
  QOneRowNoResultOptions,
  QTooManyResultsErrorFactory,
} from "./errors/q-error-factories";
export {
  QMeta,
  type QMetaMapSpan,
  type QMetaSpan,
  type QMetaSpanOfType,
  type QMetaKnownSpan,
  type QMetaMaterializationSpan,
  type QMetaCustomSpan,
  type QMetaSqlSpan,
} from "./meta/q-meta";
export type { InferQResult } from "./query-result/infer-q-result";
export type { QResultJsonifiable, QResultShape } from "./query-result/q-result";
export { QResult } from "./query-result/q-result";
export type { AsyncQResult, QError, QErrorCode } from "./query-result/types";
