import * as v from "valibot";

import {
  duckDbPathMessages,
  isSafeDbFilename,
  isSafeDbPathname,
} from "../core/db-path-validators.ts";
import { duckConnectionOptionsConstraints as constraints } from "../core/duck-connection-options-constraints.ts";
import { duckValidatorsValibot } from "./duck-validators-valibot.ts";

export const duckAllConnectionOptionsValibotSchema = v.object({
  accessMode: v.optional(v.picklist(constraints.accessMode.values)),
  compress: v.optional(v.boolean()),
  type: v.optional(v.picklist(constraints.type.values)),
  blockSize: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(constraints.blockSize.min),
      v.maxValue(constraints.blockSize.max)
    )
  ),
  rowGroupSize: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(constraints.rowGroupSize.min))
  ),
  storageVersion: v.optional(
    v.pipe(
      v.string(),
      v.startsWith(constraints.storageVersion.prefix),
      v.regex(constraints.storageVersion.pattern)
    )
  ),
  encryptionKey: v.optional(
    v.pipe(v.string(), v.minLength(constraints.encryptionKey.minLength))
  ),
  encryptionCipher: v.optional(v.picklist(constraints.encryptionCipher.values)),
  // Attach the database file.db with WAL writes disabled for improved performance:
  recoveryMode: v.optional(v.picklist(constraints.recoveryMode.values)),
});

export type DuckAllConnectionOptionsValibotSchema = v.InferOutput<
  typeof duckAllConnectionOptionsValibotSchema
>;

export const duckConnectionParamsValibotSchema = v.variant("type", [
  v.object({
    type: v.literal("memory"),
    alias: duckValidatorsValibot.aliasName,
    options: v.optional(duckAllConnectionOptionsValibotSchema),
  }),
  v.object({
    type: v.literal("filesystem"),
    path: v.pipe(
      v.string(),
      v.check(isSafeDbFilename, duckDbPathMessages.filename),
      v.check(isSafeDbPathname, duckDbPathMessages.pathname)
    ),
    alias: duckValidatorsValibot.aliasName,
    options: v.optional(duckAllConnectionOptionsValibotSchema),
  }),
]);

export type DuckConnectionParamsValibotSchema = v.InferOutput<
  typeof duckConnectionParamsValibotSchema
>;
