import { parseDsn } from "@httpx/dsn-parser";
import * as v from "valibot";

import { dsnToConnectionParams } from "../core/dsn-to-connection-params.ts";
import { duckConnectionParamsValibotSchema } from "./duck-connection-params-valibot-schema.ts";

export const duckDsnValibotSchema = v.pipe(
  v.string(),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    const result = parseDsn(dataset.value);
    if (!result.success) {
      addIssue({
        message: result.message,
      });
      return NEVER;
    }
    return dsnToConnectionParams(result.value);
  }),
  duckConnectionParamsValibotSchema
);
