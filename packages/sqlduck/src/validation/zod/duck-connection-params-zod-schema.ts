import isSafeFilename from 'is-safe-filename';
import * as z from 'zod';

import { duckStorageVersionRegexp } from '../core/base-validators.ts';
import { duckConnectionsOptions } from '../core/duck-connections-options.ts';
import { duckValidatorsZod } from './duck-validators-zod.ts';

export const duckAllConnectionOptionsZodSchema = z.strictObject({
  accessMode: z.optional(z.enum(duckConnectionsOptions.accessModes)),
  compress: z.optional(z.boolean()),
  type: z.optional(z.enum(duckConnectionsOptions.types)),
  blockSize: z.optional(z.int32().min(16_384).max(262_144)),
  rowGroupSize: z.optional(z.int32().positive()),
  storageVersion: z.optional(
    z.string().startsWith('v').regex(duckStorageVersionRegexp)
  ),
  encryptionKey: z.optional(z.string().min(8)),
  encryptionCipher: z.optional(
    z.enum(duckConnectionsOptions.encryptionCiphers)
  ),
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
    type: z.literal('filesystem'),
    path: z
      .string()
      .refine(
        (path) => {
          const filename = path.replace('\\', '/').split('/').at(-1);
          return typeof filename === 'string' && isSafeFilename(filename);
        },
        {
          message:
            'Invalid database filename - it must be a safe filename (no path traversal, no absolute paths, no reserved names, etc.)',
        }
      )
      .refine(
        (path) => {
          const pathname =
            '/' +
            path
              .replace('\\', '/')
              .split('/')
              .slice(0, -1)
              .filter(Boolean)
              .join('/');
          return (
            pathname.length > 0 &&
            pathname.startsWith('/') &&
            !pathname.includes('..')
          );
        },
        {
          message:
            'Invalid database pathname - it must be an absolute path with no traversal',
        }
      ),
    alias: duckValidatorsZod.aliasName,
    options: z.optional(duckAllConnectionOptionsZodSchema),
  }),
]);

export type DuckConnectionParamsZodSchema = z.infer<
  typeof duckConnectionParamsZodSchema
>;
