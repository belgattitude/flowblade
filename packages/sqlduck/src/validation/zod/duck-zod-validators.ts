import { duckZodObjectNameSchema } from './duck-zod-object-name.schema.ts';

/**
 * Common validators for duckdb parameters, tables...
 *
 * @example
 * ```typescript
 * import { duckZodValidators as dz } from '@flowblade/sqlduck/zod';
 *
 *
 * z.parse(dz.tableName, 'my_table'); // valid
 * z.parse(dz.tableName, 'my table'); // invalid
 * ```
 */
export const duckZodValidators = {
  /**
   * Validate duckdb objects names like table, alias, and schemas
   * for validity.
   */
  aliasName: duckZodObjectNameSchema,
  schemaName: duckZodObjectNameSchema,
  tableName: duckZodObjectNameSchema,
} as const;
