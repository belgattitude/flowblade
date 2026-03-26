export type {
  OnDataAppendedCb,
  OnDataAppendedStats,
} from './appender/data-appender-callback';
export * from './helpers';
export type { SqlDuckParams, ToTableParams } from './sql-duck.ts';
export { SqlDuck } from './sql-duck.ts';
export { getTableCreateFromZod } from './table/get-table-create-from-zod.ts';
export { zodCodecs } from './utils/zod-codecs.ts';

// Objects
export { Database } from './objects/database.ts';
export { Table } from './objects/table.ts';

// Manager
export {
  type DuckDatabaseManagerDbParams,
  duckDatabaseManagerDbParamsSchema,
} from './manager/database/duck-database-manager.schemas.ts';
export { DuckDatabaseManager } from './manager/database/duck-database-manager.ts';

// Validation
export {
  type DuckdbReservedKeywords,
  duckdbReservedKeywords,
} from './validation/core/duckdb-reserved-keywords.ts';
export {
  duckTableAliasSchema,
  duckTableNameSchema,
} from './validation/zod/duckdb-valid-names.schemas.ts';

// Logtape
export { flowbladeLogtapeSqlduckConfig } from './config/flowblade-logtape-sqlduck.config';
export { sqlduckDefaultLogtapeLogger } from './logger/sqlduck-default-logtape-logger.ts';
