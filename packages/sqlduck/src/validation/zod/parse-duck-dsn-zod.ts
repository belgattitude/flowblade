import { type ParsedDsn, parseDsn } from '@httpx/dsn-parser';

import type {
  DuckAllConnectionOptions,
  DuckConnectionParams,
} from '../core/types.ts';
import { duckConnectionParamsZodSchema } from './duck-connection-params-zod-schema.ts';
export const parseDuckDSNZod = (dsn: string): DuckConnectionParams => {
  const result = parseDsn(dsn);
  if (!result.success) {
    throw new Error(`Invalid DuckDB DSN - ${result.message}`);
  }
  const parsed = result.value as unknown as ParsedDsn & {
    params?: DuckAllConnectionOptions & {
      path?: string;
    };
  };
  const { path, ...options } = parsed.params ?? {};

  return duckConnectionParamsZodSchema.parse({
    type: parsed.host,
    alias: parsed.db,
    ...(path ? { path: path } : {}),
    options: {
      ...options,
    },
  });
};
