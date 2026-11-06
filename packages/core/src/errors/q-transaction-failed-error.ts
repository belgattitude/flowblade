import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown by `transactionOrThrow()` when the transaction itself failed, rather
 * than its callback: it couldn't begin (ie: no connection available), commit
 * (ie: serialization failure) or roll back. Exported as `QErrors.TransactionFailed`,
 * the `cause` holds the driver error.
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
 *   await ds.transactionOrThrow(async (tx) => {
 *     await tx.queryOrThrow(insertOrder);
 *   });
 * } catch (e) {
 *   if (e instanceof QErrors.TransactionFailed) {
 *     // ie: "Transaction failed: could not serialize access..."
 *     console.error(e.message, e.cause);
 *   }
 *   throw e;
 * }
 * ```
 */
export class QTransactionFailedError extends Error {
  static readonly [brandKey]: string = "QTransactionFailedError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QTransactionFailedError";
  readonly code = "TRANSACTION_FAILED";
  /**
   * Suggested http status code: 500 Internal Server Error
   */
  readonly statusCode = 500 as const;

  /**
   * @param message the error message, prefixed with "Transaction failed: "
   * @param options the driver error as `cause`
   */
  constructor(message: string, options?: ErrorOptions) {
    super(`Transaction failed: ${message}`, options);
    addBrand(this, new.target);
  }
}
