import { parseDsn, parseDsnOrThrow } from "@httpx/dsn-parser";
import type { ParsedDsn } from "@httpx/dsn-parser";
import * as v from "valibot";

import type { DuckAllConnectionOptions } from "../core/types.ts";
import { duckConnectionParamsValibotSchema } from "./duck-connection-params-valibot-schema.ts";
import type { DuckConnectionParamsValibotSchema } from "./duck-connection-params-valibot-schema.ts";

export const duckDsnValibotSchema = v.pipe(
  v.string(),
  v.check(
    (dsn) => parseDsn(dsn).success,
    (input) => {
      const result = parseDsn(input.input);
      return result.success ? "Invalid DSN" : result.message;
    }
  ),
  v.transform((dsn) => {
    const parsedDsn = parseDsnOrThrow(dsn);
    // result.success is guaranteed by v.check above
    const parsed = parsedDsn;
    const { path, ...options } = (parsed.params ??
      {}) as DuckAllConnectionOptions & {
      path?: string;
    };

    const base = {
      type: parsed.host,
      alias: parsed.db,
      options: {
        ...options,
      },
    };
    return (
      path !== undefined && path !== "" ? { ...base, path } : base
    ) as DuckConnectionParamsValibotSchema;
  }),
  duckConnectionParamsValibotSchema
);
