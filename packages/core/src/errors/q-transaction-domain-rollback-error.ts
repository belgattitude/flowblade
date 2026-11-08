import { brandKey, hasBrand } from "../utils/brand";
import {
  QDomainRollbackError,
  type QDomainRollbackOptions,
} from "./q-domain-rollback-error";

export type QTransactionDomainRollbackOptions = Omit<
  QDomainRollbackOptions,
  "cause"
> & {
  cause?: QDomainRollbackError;
};

/**
 * Transaction result error for an expected domain rollback. Its cause is the
 * original domain error thrown by the transaction callback.
 */
export class QTransactionDomainRollbackError extends QDomainRollbackError {
  static readonly [brandKey]: string = "QTransactionDomainRollbackError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return super[Symbol.hasInstance](value) || hasBrand(value, this);
  }

  override readonly name: string = "QTransactionDomainRollbackError";
  declare readonly cause?: QDomainRollbackError;

  // oxlint-disable-next-line no-useless-constructor -- restrict cause to a domain rollback.
  constructor(reason: string, options?: QTransactionDomainRollbackOptions) {
    super(reason, options);
  }
}
