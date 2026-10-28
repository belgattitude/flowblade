import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown when a query fails (ie: `queryOrThrow()`, `queryOneOrThrow()`,
 * `stream()`, `QResult.getOrThrow()` on a "QUERY_FAILED" result), exported
 * as `QErrors.QueryFailed`. The `cause` holds the driver error.
 *
 * `instanceof` also recognizes errors created by another copy of the
 * same @flowblade/core major version (ie: duplicated installs, bundled copies).
 *
 * `statusCode` is the suggested http status (500), recognized by http error
 * helpers (ie: `isErrorWithErrorStatusCode()` from @httpx/exception).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   const { data } = await ds.queryOrThrow(query);
 * } catch (e) {
 *   if (e instanceof QErrors.QueryFailed) {
 *     // ie: "Query failed: Catalog Error: Table with name product does not exist!"
 *     console.error(e.message, e.cause);
 *   }
 *   throw e;
 * }
 * ```
 */
export class QQueryFailedError extends Error {
  static readonly [brandKey]: string = "QQueryFailedError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QQueryFailedError";
  readonly code = "QUERY_FAILED";
  /**
   * Suggested http status code: 500 Internal Server Error
   */
  readonly statusCode = 500 as const;

  /**
   * @param message the driver error message, prefixed with "Query failed: "
   * @param options the driver error as `cause`
   */
  constructor(message: string, options?: ErrorOptions) {
    super(`Query failed: ${message}`, options);
    addBrand(this, new.target);
  }
}
