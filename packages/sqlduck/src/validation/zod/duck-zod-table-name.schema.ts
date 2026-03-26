import * as z from 'zod';

import { duckReservedKeywords } from '../core/duck-reserved-keywords.ts';

const duckdbMaximumObjectNameLength = 120;
const duckDbObjectNameRegex = /^[a-z_]\w*$/i;

const duckdbReservedKeywordsSet = new Set(
  duckReservedKeywords.map((k) => k.toUpperCase())
);

/**
 * Check whether a table name identifier is valid
 */
export const duckZodTableNameSchema = z
  .string()
  .min(1)
  .max(duckdbMaximumObjectNameLength)
  .regex(
    duckDbObjectNameRegex,
    'Object name must start with a letter or underscore, and contain only letters, numbers and underscores'
  )
  .refine((value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()), {
    error: `Provided object value is a DuckDB reserved keyword and cannot be used as an identifier`,
  });
