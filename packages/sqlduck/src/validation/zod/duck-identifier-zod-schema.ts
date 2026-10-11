import * as z from "zod";

import { duckIdentifierConstraints as constraints } from "../core/base-validators.ts";
import { duckdbReservedKeywordsSet } from "../core/duck-reserved-keywords.ts";

/**
 * Check whether a table name identifier is valid
 */
export const duckIdentifierZodSchema = z
  .string()
  .min(constraints.minLength)
  .max(constraints.maxLength)
  .regex(constraints.pattern, constraints.messages.format)
  .refine((value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()), {
    message: constraints.messages.reservedKeyword,
  });
