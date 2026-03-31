import * as z from 'zod';

import { duckStorageVersionRegexp } from '../core/base-validators.ts';
import { duckValidatorsZod } from './duck-validators-zod.ts';

export const duckAllConnectionOptionsZodSchema = z.strictObject({
  accessMode: z.optional(z.enum(['READ_ONLY', 'READ_WRITE'])),
  compress: z.optional(z.boolean()),
  type: z.optional(z.enum(['DUCKDB', 'SQLITE'])),
  blockSize: z.optional(z.int32().min(16_384).max(262_144)),
  rowGroupSize: z.optional(z.int32().positive()),
  storageVersion: z.optional(
    z.string().startsWith('v').regex(duckStorageVersionRegexp)
  ),
  encryptionKey: z.optional(z.string().min(8)),
  encryptionCipher: z.optional(z.enum(['CBC', 'CTR', 'GCM'])),
});

export type DuckAllConnectionOptionsZodSchema = z.infer<
  typeof duckAllConnectionOptionsZodSchema
>;

export const duckConnectionParamsZodSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('memory'),
    alias: duckValidatorsZod.aliasName,
    options: z.optional(duckAllConnectionOptionsZodSchema),
  }),
  z.strictObject({
    type: z.literal('duckdb'),
    path: z.string().min(4).endsWith('.db'),
    alias: duckValidatorsZod.aliasName,
    options: z.optional(duckAllConnectionOptionsZodSchema),
  }),
]);

export type DuckConnectionParamsZodSchema = z.infer<
  typeof duckConnectionParamsZodSchema
>;
