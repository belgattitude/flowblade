import * as v from 'valibot';

import {
  duckIdentifierMaxLength,
  duckIdentifierNameRegex,
} from '../core/base-validators.ts';
import { duckdbReservedKeywordsSet } from '../core/duck-reserved-keywords.ts';

/**
 * Check whether a table name identifier is valid
 */
export const duckIdentifierValibotSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(duckIdentifierMaxLength),
  v.regex(
    duckIdentifierNameRegex,
    'Identifier must start with a letter or underscore, and contain only letters, numbers and underscores'
  ),
  v.check(
    (value) => !duckdbReservedKeywordsSet.has(value.toUpperCase()),
    'Identifier value is a DuckDB reserved keyword and cannot be used as an identifier'
  )
);
