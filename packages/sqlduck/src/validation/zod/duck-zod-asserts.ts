import * as z from 'zod';

import { createAssertError } from '../core/create-assert-error.ts';
import type {
  DuckAliasName,
  DuckSchemaName,
  DuckTableName,
} from '../core/types.ts';
import { duckZodValidators } from './duck-zod-validators.ts';

export function assertValidAliasName(
  aliasName: string
): asserts aliasName is DuckAliasName {
  const parsed = z.safeParse(duckZodValidators.aliasName, aliasName);
  if (parsed.error) {
    throw createAssertError(
      `'${aliasName}' is not a valid alias name: ${parsed.error.message}`
    );
  }
}

export function assertValidSchemaName(
  schemaName: string
): asserts schemaName is DuckSchemaName {
  const parsed = z.safeParse(duckZodValidators.schemaName, schemaName);
  if (parsed.error) {
    throw createAssertError(
      `'${schemaName}' is not a valid schema name: ${parsed.error.message}`
    );
  }
}

export function assertValidTableName(
  tableName: string
): asserts tableName is DuckTableName {
  const parsed = z.safeParse(duckZodValidators.tableName, tableName);
  if (parsed.error) {
    throw createAssertError(
      `'${tableName}' is not a valid table name: ${parsed.error.message}`
    );
  }
}
