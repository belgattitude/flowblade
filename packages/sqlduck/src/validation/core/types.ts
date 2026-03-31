import type {
  DuckAllConnectionOptionsZodSchema,
  DuckConnectionParamsZodSchema,
} from '../zod/duck-connection-params-zod-schema.ts';

export type DuckAliasName = string;
export type DuckTableName = string;
export type DuckSchemaName = string;

export type DuckConnectionParams = DuckConnectionParamsZodSchema;
export type DuckAllConnectionOptions = DuckAllConnectionOptionsZodSchema;
