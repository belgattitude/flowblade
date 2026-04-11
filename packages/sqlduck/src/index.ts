export type {
  OnChunkAppendedCb,
  OnChunkAppendedStats,
} from './appender/data-appender-callback';
export * from './helpers';
export type { SqlDuckParams, ToTableParams } from './sql-duck.ts';
export { SqlDuck } from './sql-duck.ts';
export { getTableCreateFromZod } from './table/get-table-create-from-zod.ts';
export { zodCodecs } from './utils/zod-codecs.ts';

// Objects
export { Database } from './objects/database.ts';
export { Table } from './objects/table.ts';

// Core types
export { type DuckConnectionParams } from './validation/core/types.ts';

// Core validation
export type { DuckdbReservedKeywords } from './validation/core/duck-reserved-keywords.ts';
export { duckReservedKeywords } from './validation/core/duck-reserved-keywords.ts';

// Manager
export { DuckDatabaseManager } from './manager/database/duck-database-manager.ts';

// Logtape
export { flowbladeLogtapeSqlduckConfig } from './config/flowblade-logtape-sqlduck.config';
export { sqlduckDefaultLogtapeLogger } from './logger/sqlduck-default-logtape-logger.ts';
