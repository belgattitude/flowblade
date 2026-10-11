import { parseDsn } from "@httpx/dsn-parser";
import * as z from "zod";

import { dsnToConnectionParams } from "../core/dsn-to-connection-params.ts";
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
    return dsnToConnectionParams(result.value);
  })
  .pipe(duckConnectionParamsZodSchema);
