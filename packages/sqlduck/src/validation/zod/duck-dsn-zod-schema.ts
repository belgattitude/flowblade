import { type ParsedDsn, parseDsn } from '@httpx/dsn-parser';
import * as z from 'zod';

import type {
  DuckAllConnectionOptions,
  DuckConnectionParams,
} from '../core/types.ts';
import { duckConnectionParamsZodSchema } from './duck-connection-params-zod-schema.ts';

export const duckDsnZodSchema = z
  .string()
  .transform((dsn, ctx) => {
    const result = parseDsn(dsn);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message: result.message,
      });
      return z.NEVER;
    }

    const parsed = result.value as unknown as ParsedDsn & {
      params?: DuckAllConnectionOptions & { path?: string };
    };
    const { path, ...options } = parsed.params ?? {};

    return {
      type: parsed.host,
      alias: parsed.db,
      ...(path ? { path } : {}),
      options: { ...options },
    } as DuckConnectionParams;
  })
  .pipe(duckConnectionParamsZodSchema);
