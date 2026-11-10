export * from "./helpers/index.ts";
export type {
  OnChunkAppendedCb,
  OnChunkAppendedStats,
  SqlDuckParams,
  ToTableParams,
} from "./sql-duck.ts";
export { SqlDuck } from "./sql-duck.ts";
export {
  getTableCreateFromZod,
  type SupportedCustomDuckDbTypes,
} from "./table/get-table-create-from-zod.ts";
export { zodCodecs } from "./utils/zod-codecs.ts";

// Objects
export { Database } from "./objects/database.ts";
export { Table } from "./objects/table.ts";

// Core types
export { type DuckConnectionParams } from "./validation/core/types.ts";

// Core validation
export type { DuckdbReservedKeywords } from "./validation/core/duck-reserved-keywords.ts";
export { duckReservedKeywords } from "./validation/core/duck-reserved-keywords.ts";

// Manager
export { DuckDatabaseManager } from "./manager/database/duck-database-manager.ts";
export { DuckExtensionsManager } from "./manager/extensions/duck-extensions-manager.ts";
export { DuckSecretsManager } from "./manager/secrets/duck-secrets-manager.ts";
export type {
  CreateSecretParams,
  DuckAzureSecret,
  DuckCustomSecret,
  DuckHttpSecret,
  DuckS3Secret,
  DuckSecret,
  DuckSecretInfo,
  DuckSecretOptionValue,
} from "./manager/secrets/duck-secrets.types.ts";
export { DuckSettingsManager } from "./manager/settings/duck-settings-manager.ts";
export type {
  DuckGlobalSettings,
  DuckSessionSettings,
  DuckSettings,
  DuckSettingValue,
} from "./manager/settings/duck-settings.types.ts";

// Logtape
export { flowbladeLogtapeSqlduckConfig } from "./config/flowblade-logtape-sqlduck.config.ts";
export { sqlduckDefaultLogtapeLogger } from "./logger/sqlduck-default-logtape-logger.ts";
