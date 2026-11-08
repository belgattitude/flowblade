import { addBrand, brandKey, hasBrand } from "../utils/brand";

export type QDomainRollbackOptions = ErrorOptions & {
  details?: unknown;
};

/**
 * Thrown inside a transaction to represent an expected domain rejection that
 * must roll back. `reason` and `details` are copied to the non-throwing
 * transaction result, so keep `details` serializable when it crosses a
 * process boundary.
 */
export class QDomainRollbackError extends Error {
  static readonly [brandKey]: string = "QDomainRollbackError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name: string = "QDomainRollbackError";
  readonly code = "DOMAIN_ROLLBACK";
  readonly reason: string;
  readonly details: unknown;

  constructor(reason: string, options?: QDomainRollbackOptions) {
    super(`Domain rollback: ${reason}`, options);
    this.reason = reason;
    this.details = options?.details;
    addBrand(this, new.target);
  }
}
