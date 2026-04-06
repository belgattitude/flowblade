import * as z from 'zod';

import {
  duckIdentifierMaxLength,
  duckIdentifierNameRegex,
} from '../core/base-validators.ts';
import { duckdbReservedKeywordsSet } from '../core/duck-reserved-keywords.ts';

/**
 * Check whether a table name identifier is valid
 */
export const duckIdentifierZodSchema = z
  .string()
  .min(1)
  .max(duckIdentifierMaxLength)
  .regex(
    duckIdentifierNameRegex,
    'Identifier must start with a letter or underscore, and contain only letters, numbers and underscores'
  )
  .refine((value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()), {
    message: `Identifier value is a DuckDB reserved keyword and cannot be used as an identifier`,
  });
