import * as z from 'zod';

import { duckTableAliasSchema } from '../../validation/zod/duckdb-valid-names.schemas.ts';

const duckdbSemverRegexp = /^v?\d{1,4}\.\d{1,4}\.\d{1,4}$/;

const duckdbAttachOptionsSchema = z.strictObject({
  ACCESS_MODE: z.optional(z.enum(['READ_ONLY', 'READ_WRITE', 'AUTOMATIC'])),
  COMPRESS: z.optional(z.enum(['true', 'false'])),
  TYPE: z.optional(z.enum(['DUCKDB', 'SQLITE'])),
  BLOCK_SIZE: z.optional(z.int32().min(16_384).max(262_144)),
  ROW_GROUP_SIZE: z.optional(z.int32().positive()),
  STORAGE_VERSION: z.optional(
    z.string().startsWith('v').regex(duckdbSemverRegexp)
  ),
  ENCRYPTION_KEY: z.optional(z.string().min(8)),
  ENCRYPTION_CIPHER: z.optional(z.enum(['CBC', 'CTR', 'GCM'])),
});

export const duckDatabaseManagerDbParamsSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal(':memory:'),
    alias: duckTableAliasSchema,
    options: z.optional(duckdbAttachOptionsSchema),
  }),
  z.strictObject({
    type: z.literal('duckdb'),
    path: z.string().min(1).endsWith('.db'),
    alias: duckTableAliasSchema,
    options: z.optional(duckdbAttachOptionsSchema),
  }),
]);

export type DuckDatabaseManagerDbParams = z.infer<
  typeof duckDatabaseManagerDbParamsSchema
>;
