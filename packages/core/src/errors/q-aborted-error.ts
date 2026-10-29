import { addBrand, brandKey, hasBrand } from "../utils/brand";

const isTimeoutReason = (reason: unknown): boolean =>
  // name based: also matches a DOMException from another realm
  typeof reason === "object" &&
  reason !== null &&
  (reason as { name?: unknown }).name === "TimeoutError";

/**
 * Thrown when a query is aborted with its `signal` (ie: `queryOrThrow()`,
 * `queryOneOrThrow()`, `stream()`, `QResult.getOrThrow()` on an "ABORTED"
 * result), exported as `QErrors.Aborted`. The `cause` holds the abort reason
 * (ie: a TimeoutError or AbortError DOMException).
 *
 * `instanceof` also recognizes errors created by another copy of the
 * same @flowblade/core major version (ie: duplicated installs, bundled copies).
 *
 * `statusCode` is the suggested http status, recognized by http error
 * helpers (ie: `isErrorWithErrorStatusCode()` from @httpx/exception):
 * - 504 Gateway Timeout when aborted by a timeout (`AbortSignal.timeout()`),
 *   the database didn't answer in time,
 * - 499 Client Closed Request otherwise (non standard, popularized by nginx),
 *   ie: aborted because the client went away (`request.signal`).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   const { data } = await ds.queryOrThrow(query, {
 *     signal: AbortSignal.timeout(5_000),
 *   });
 * } catch (e) {
 *   if (e instanceof QErrors.Aborted) {
 *     // e.statusCode === 504, e.cause is the TimeoutError
 *   }
 *   throw e;
 * }
 * ```
 */
export class QAbortedError extends Error {
  static readonly [brandKey]: string = "QAbortedError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QAbortedError";
  readonly code = "ABORTED";
  /**
   * Suggested http status code: 504 Gateway Timeout when aborted by a
   * timeout, 499 Client Closed Request otherwise.
   */
  readonly statusCode: 499 | 504;

  /**
   * @param message the error message, prefixed with "Query aborted: "
   * @param options the abort reason as `cause`
   */
  constructor(message: string, options?: ErrorOptions) {
    super(`Query aborted: ${message}`, options);
    this.statusCode = isTimeoutReason(options?.cause) ? 504 : 499;
    addBrand(this, new.target);
  }
}
