import { addBrand, brandKey, hasBrand } from "../utils/brand";

/**
 * Thrown by `tx.rollback()` to roll back a transaction from its callback,
 * exported as `QErrors.RolledBack`.
 *
 * `transaction()` returns it as the cause of a "ROLLED_BACK" error, and
 * `transactionOrThrow()` throws it (an error thrown by the callback is
 * rethrown as is). Also thrown by `transactionOrThrow()` when the callback
 * throws a non Error value (kept as `cause`).
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
 *     const { data: account } = await tx.queryOneOrThrow(getAccount);
 *     if (account.balance < amount) {
 *       tx.rollback("insufficient funds");
 *     }
 *     await tx.queryOrThrow(withdraw);
 *   });
 * } catch (e) {
 *   if (e instanceof QErrors.RolledBack) {
 *     // ie: "Transaction rolled back: insufficient funds"
 *     console.error(e.message);
 *   }
 *   throw e;
 * }
 * ```
 */
export class QRolledBackError extends Error {
  static readonly [brandKey]: string = "QRolledBackError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name = "QRolledBackError";
  readonly code = "ROLLED_BACK";
  /**
   * Suggested http status code: 500 Internal Server Error
   */
  readonly statusCode = 500 as const;

  /**
   * @param reason why the transaction was rolled back, appended to the
   *               message ("Transaction rolled back: <reason>")
   * @param options ie: the value thrown by the callback as `cause`
   */
  constructor(reason?: string, options?: ErrorOptions) {
    super(
      reason === undefined || reason === ""
        ? "Transaction rolled back"
        : `Transaction rolled back: ${reason}`,
      options
    );
    addBrand(this, new.target);
  }
}
