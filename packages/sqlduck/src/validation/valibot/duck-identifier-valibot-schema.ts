import * as v from "valibot";

import { duckIdentifierConstraints as constraints } from "../core/base-validators.ts";
import { duckdbReservedKeywordsSet } from "../core/duck-reserved-keywords.ts";

/**
 * Check whether a table name identifier is valid
 */
export const duckIdentifierValibotSchema = v.pipe(
  v.string(),
  v.minLength(constraints.minLength),
  v.maxLength(constraints.maxLength),
  v.regex(constraints.pattern, constraints.messages.format),
  v.check(
    (value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()),
    constraints.messages.reservedKeyword
  )
);
