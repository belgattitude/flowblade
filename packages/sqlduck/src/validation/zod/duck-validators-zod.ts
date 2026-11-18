import { duckIdentifierZodSchema } from "./duck-identifier-zod-schema.ts";
import {
  duckMemoryLimitZodSchema,
  duckThreadsZodSchema,
} from "./duck-settings-zod-schemas.ts";

/**
 * Common validators for duckdb parameters, tables...
 *
 * @example
 * ```typescript
 * import { duckValidatorsZod } from '@flowblade/sqlduck/zod';
 *
 * duckValidatorsZod.tableName.parse('my_table'); // valid
 * duckValidatorsZod.tableName.parse('my table'); // invalid
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
  /**
   * Validate a DuckDB `memory_limit` setting value
   * (e.g. "512MB", "2.7GB", "4GiB", "80%").
   */
  memoryLimit: duckMemoryLimitZodSchema,
  /**
   * Validate a DuckDB `threads` setting value given as a string (e.g. "4").
   */
  threads: duckThreadsZodSchema,
} as const;
