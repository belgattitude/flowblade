import { duckIdentifierZodSchema } from './duck-identifier-zod-schema.ts';

/**
 * Common validators for duckdb parameters, tables...
 *
 * @example
 * ```typescript
 * import { duckValidatorsZod } from '@flowblade/sqlduck/zod';
 *
 * z.parse(duckValidatorsZod.tableName, 'my_table'); // valid
 * z.parse(duckValidatorsZod.tableName, 'my table'); // invalid
 * ```
 */
export const duckValidatorsZod = {
  /**
   * Validate duckdb objects names like table, alias, and schemas
   * for validity.
   */
  aliasName: duckIdentifierZodSchema,
  schemaName: duckIdentifierZodSchema,
  tableName: duckIdentifierZodSchema,
} as const;
