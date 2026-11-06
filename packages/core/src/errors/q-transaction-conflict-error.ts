import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown by `transactionOrThrow()` when the transaction conflicts with a
 * concurrent one (ie: serialization failure, deadlock, write-write conflict),
 * exported as `QErrors.TransactionConflict`. The `cause` holds the error
 * (ie: the `QErrors.QueryFailed` thrown in the callback, or the driver error).
 *
 * Conflicts are transient: running the transaction again usually succeeds,
 * see the `retry` option of `transaction()` / `transactionOrThrow()`.
 *
 * `instanceof` also recognizes errors created by another copy of the
 * same @flowblade/core major version (ie: duplicated installs, bundled copies).
 *
 * `statusCode` is the suggested http status (409), recognized by http error
 * helpers (ie: `isErrorWithErrorStatusCode()` from @httpx/exception).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   await ds.transactionOrThrow(
 *     async (tx) => {
 *       await tx.queryOrThrow(updateStock);
 *     },
 *     { isolationLevel: "serializable", retry: { maxRetries: 3 } }
 *   );
 * } catch (e) {
 *   if (e instanceof QErrors.TransactionConflict) {
 *     // still conflicting after 3 retries
 *     console.error(e.message, e.cause);
 *   }
 *   throw e;
 * }
 * ```
 */
export class QTransactionConflictError extends Error {
  static readonly [brandKey]: string = "QTransactionConflictError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QTransactionConflictError";
  readonly code = "TRANSACTION_CONFLICT";
  /**
   * Suggested http status code: 409 Conflict
   */
  readonly statusCode = 409 as const;

  /**
   * @param message the error message, prefixed with "Transaction conflict: "
   * @param options the error as `cause`
   */
  constructor(message: string, options?: ErrorOptions) {
    super(`Transaction conflict: ${message}`, options);
    addBrand(this, new.target);
  }
}
