import * as z from 'zod';

import { createAssertError } from '../core/create-assert-error.ts';
import type {
  DuckAliasName,
  DuckSchemaName,
  DuckTableName,
} from '../core/types.ts';
import { duckValidatorsZod } from './duck-validators-zod.ts';

export function assertValidAliasName(
  aliasName: string
): asserts aliasName is DuckAliasName {
  const parsed = z.safeParse(duckValidatorsZod.aliasName, aliasName);
  if (parsed.error) {
    throw createAssertError(
      `'${aliasName}' is not a valid alias name: ${parsed.error.message}`
    );
  }
}

export function assertValidSchemaName(
  schemaName: string
): asserts schemaName is DuckSchemaName {
  const parsed = z.safeParse(duckValidatorsZod.schemaName, schemaName);
  if (parsed.error) {
    throw createAssertError(
      `'${schemaName}' is not a valid schema name: ${parsed.error.message}`
    );
  }
}

export function assertValidTableName(
  tableName: string
): asserts tableName is DuckTableName {
  const parsed = z.safeParse(duckValidatorsZod.tableName, tableName);
  if (parsed.error) {
    throw createAssertError(
      `'${tableName}' is not a valid table name: ${parsed.error.message}`
    );
  }
}
