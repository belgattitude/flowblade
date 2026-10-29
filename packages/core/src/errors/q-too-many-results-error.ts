import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown by `queryOneOrThrow()` when the query returns more than one row
 * (`queryOne()` returns it as the error `cause`), exported as `QErrors.TooManyResults`.
 *
 * `instanceof` also recognizes errors created by another copy of the
 * same @flowblade/core major version (ie: duplicated installs, bundled copies).
 *
 * `statusCode` is the suggested http status (500, more than one row means a
 * missing condition or broken data integrity), recognized by http error
 * helpers (ie: `isErrorWithErrorStatusCode()` from @httpx/exception).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   const { data: product } = await ds.queryOneOrThrow(query);
 * } catch (e) {
 *   if (e instanceof QErrors.TooManyResults) {
 *     console.error(`Expected one row, received ${e.rowCount}`);
 *   }
 *   throw e;
 * }
 * ```
 */
export class QTooManyResultsError extends Error {
  static readonly [brandKey]: string = "QTooManyResultsError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QTooManyResultsError";
  readonly code = "TOO_MANY_RESULTS";
  /**
   * Suggested http status code: 500 Internal Server Error
   */
  readonly statusCode = 500 as const;
  /**
   * Number of rows returned by the query
   */
  readonly rowCount: number;

  constructor(rowCount: number) {
    super(`Expected exactly one row, received ${rowCount}`);
    this.rowCount = rowCount;
    addBrand(this, new.target);
  }
}
