import {duckIdentifierNameRegex} from "./base-validators.ts";
import {duckReservedKeywords} from "./duck-reserved-keywords.ts";

/**
 * Check whether a table name identifier is valid
 */
export const isDuckdbValidIdentifier = (identifier: string): boolean => {
    return duckIdentifierNameRegex.test(identifier) && !duckReservedKeywords.includes(identifier)
}