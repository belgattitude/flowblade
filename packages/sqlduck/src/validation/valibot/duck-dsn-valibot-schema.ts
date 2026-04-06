import { type ParsedDsn, parseDsn, parseDsnOrThrow } from '@httpx/dsn-parser';
import * as v from 'valibot';

import type { DuckAllConnectionOptions } from '../core/types.ts';
import {
  type DuckConnectionParamsValibotSchema,
  duckConnectionParamsValibotSchema,
} from './duck-connection-params-valibot-schema.ts';

export const duckDsnValibotSchema = v.pipe(
  v.string(),
  v.check(
    (dsn) => parseDsn(dsn).success,
    (input) => {
      return (
        (parseDsn(input.input) as unknown as { message?: string })?.message ??
        'Invalid DSN'
      );
    }
  ),
  v.transform((dsn) => {
    const parsedDsn = parseDsnOrThrow(dsn);
    // result.success is guaranteed by v.check above
    const parsed = parsedDsn as unknown as ParsedDsn & {
      params?: DuckAllConnectionOptions & {
        path?: string;
      };
    };
    const { path, ...options } = parsed.params ?? {};

    return {
      type: parsed.host,
      alias: parsed.db,
      ...(path ? { path: path } : {}),
      options: {
        ...options,
      },
    } as DuckConnectionParamsValibotSchema;
  }),
  duckConnectionParamsValibotSchema
);
