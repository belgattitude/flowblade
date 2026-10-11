import { duckIdentifierConstraints } from "./base-validators.ts";
import { duckReservedKeywords } from "./duck-reserved-keywords.ts";

/**
 * Check whether a table name identifier is valid
 */
export const isDuckdbValidIdentifier = (identifier: string): boolean =>
  duckIdentifierConstraints.pattern.test(identifier) &&
  !duckReservedKeywords.includes(identifier);
