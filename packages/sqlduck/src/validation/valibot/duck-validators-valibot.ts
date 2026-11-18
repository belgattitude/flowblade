import { duckIdentifierValibotSchema } from "./duck-identifier-valibot-schema.ts";
import {
  duckMemoryLimitValibotSchema,
  duckThreadsValibotSchema,
} from "./duck-settings-valibot-schemas.ts";

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
  /**
   * Validate a DuckDB `memory_limit` setting value
   * (e.g. "512MB", "2.7GB", "4GiB", "80%").
   */
  memoryLimit: duckMemoryLimitValibotSchema,
  /**
   * Validate a DuckDB `threads` setting value given as a string (e.g. "4").
   */
  threads: duckThreadsValibotSchema,
} as const;
