/**
 * Helpers to implement a flowblade datasource (`DatasourceInterface`), exported
 * as `@flowblade/core/datasource`.
 *
 * @example
 * ```typescript
 * import { QMeta } from "@flowblade/core";
 * import {
 *   createQResultError,
 *   createQResultSuccess,
 *   createSqlSpan,
 * } from "@flowblade/core/datasource";
 *
 * const span = createSqlSpan({ sql, params });
 * try {
 *   const rows = await driver.execute(sql, params);
 *   return createQResultSuccess(rows, new QMeta({ name, spans: span }));
 * } catch (error) {
 *   return createQResultError(
 *     { message: String(error), code: "QUERY_FAILED", cause: error },
 *     new QMeta({ name, spans: span })
 *   );
 * }
 * ```
 *
 * @module
 */
export {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  getOneRowOrThrow,
  toOneRowQResult,
} from "../utils/datasource.factories";
