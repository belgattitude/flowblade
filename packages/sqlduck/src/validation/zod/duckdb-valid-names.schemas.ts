import * as z from 'zod';

import { duckdbReservedKeywords } from '../core/duckdb-reserved-keywords.ts';

const duckdbMaximumObjectNameLength = 120;
const duckDbObjectNameRegex = /^[a-z_]\w*$/i;

const duckdbReservedKeywordsSet = new Set(
  duckdbReservedKeywords.map((k) => k.toUpperCase())
);

export const duckTableNameSchema = z
  .string()
  .min(1)
  .max(duckdbMaximumObjectNameLength)
  .regex(
    duckDbObjectNameRegex,
    'Table name must start with a letter or underscore, and contain only letters, numbers and underscores'
  )
  .refine((value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()), {
    error: `Value is a DuckDB reserved keyword and cannot be used as a table name`,
  });
export const duckTableAliasSchema = duckTableNameSchema;
