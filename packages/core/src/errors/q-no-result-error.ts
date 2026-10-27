import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown by `queryOneOrThrow()` when the query returns no row, exported
 * as `QErrors.NoResult`.
 *
 * `instanceof` also recognizes errors created by another copy of the
 * same @flowblade/core major version (ie: duplicated installs, bundled copies).
 *
 * `statusCode` is the suggested http status (404), recognized by http error
 * helpers (ie: `isErrorWithErrorStatusCode()` from @httpx/exception).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   const { data: product } = await ds.queryOneOrThrow(query);
 * } catch (e) {
 *   if (e instanceof QErrors.NoResult) {
 *     // not found, ie: return a 404
 *   }
 *   throw e;
 * }
 * ```
 */
export class QNoResultError extends Error {
  static readonly [brandKey]: string = "QNoResultError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QNoResultError";
  readonly code = "NO_RESULT";
  /**
   * Suggested http status code: 404 Not Found
   */
  readonly statusCode = 404 as const;

  constructor() {
    super("Expected exactly one row, received none");
    addBrand(this, new.target);
  }
}
