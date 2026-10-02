import { parseDsn } from "@httpx/dsn-parser";
import type { ParsedDsn } from "@httpx/dsn-parser";
import * as z from "zod";

import type {
  DuckAllConnectionOptions,
  DuckConnectionParams,
} from "../core/types.ts";
import { duckConnectionParamsZodSchema } from "./duck-connection-params-zod-schema.ts";

export const duckDsnZodSchema = z
  .string()
  .transform((dsn, ctx) => {
    const result = parseDsn(dsn);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: result.message,
      });
      return z.NEVER;
    }

    const parsed = result.value;
    const { path, ...options } = (parsed.params ??
      {}) as DuckAllConnectionOptions & {
      path?: string;
    };

    const base = {
      type: parsed.host,
      alias: parsed.db,
      options: { ...options },
    };
    return (
      path === undefined ? base : { ...base, path }
    ) as DuckConnectionParams;
  })
  .pipe(duckConnectionParamsZodSchema);
