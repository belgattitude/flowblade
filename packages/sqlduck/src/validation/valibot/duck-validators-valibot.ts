import { duckIdentifierValibotSchema } from './duck-identifier-valibot-schema.ts';

/**
 * Common validators for duckdb parameters, tables...
 *
 * @example
 * ```typescript
 * import { duckValidatorsValibot } from '@flowblade/sqlduck/valibot';
 *
 * ```
 */
export const duckValidatorsValibot = {
  /**
   * Validate duckdb objects names like table, alias, and schemas
   * for validity.
   */
  aliasName: duckIdentifierValibotSchema,
  schemaName: duckIdentifierValibotSchema,
  tableName: duckIdentifierValibotSchema,
} as const;
