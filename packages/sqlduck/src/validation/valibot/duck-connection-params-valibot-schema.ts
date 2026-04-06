import isSafeFilename from 'is-safe-filename';
import * as v from 'valibot';

import { duckStorageVersionRegexp } from '../core/base-validators.ts';
import { duckValidatorsValibot } from './duck-validators-valibot.ts';

export const duckAllConnectionOptionsValibotSchema = v.object({
  accessMode: v.optional(v.picklist(['READ_ONLY', 'READ_WRITE'])),
  compress: v.optional(v.boolean()),
  type: v.optional(v.picklist(['DUCKDB', 'SQLITE', 'MYSQL', 'PostgreSQL)'])),
  blockSize: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(16_384), v.maxValue(262_144))
  ),
  rowGroupSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  storageVersion: v.optional(
    v.pipe(v.string(), v.startsWith('v'), v.regex(duckStorageVersionRegexp))
  ),
  encryptionKey: v.optional(v.pipe(v.string(), v.minLength(8))),
  encryptionCipher: v.optional(v.picklist(['CBC', 'CTR', 'GCM'])),
});

export type DuckAllConnectionOptionsValibotSchema = v.InferOutput<
  typeof duckAllConnectionOptionsValibotSchema
>;

export const duckConnectionParamsValibotSchema = v.variant('type', [
  v.object({
    type: v.literal('memory'),
    alias: duckValidatorsValibot.aliasName,
    options: v.optional(duckAllConnectionOptionsValibotSchema),
  }),
  v.object({
    type: v.literal('filesystem'),
    path: v.pipe(
      v.string(),
      v.check((path) => {
        const filename = path.replace('\\', '/').split('/').at(-1);
        return typeof filename === 'string' && isSafeFilename(filename);
      }, 'Invalid database filename - it must be a safe filename (no path traversal, no absolute paths, no reserved names, etc.)'),
      v.check((path) => {
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
      }, 'Invalid database pathname - it must be an absolute path with no traversal')
    ),
    alias: duckValidatorsValibot.aliasName,
    options: v.optional(duckAllConnectionOptionsValibotSchema),
  }),
]);

export type DuckConnectionParamsValibotSchema = v.InferOutput<
  typeof duckConnectionParamsValibotSchema
>;
