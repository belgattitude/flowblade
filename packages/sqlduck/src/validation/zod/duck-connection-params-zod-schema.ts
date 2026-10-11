import * as z from "zod";

import {
  duckDbPathMessages,
  isSafeDbFilename,
  isSafeDbPathname,
} from "../core/db-path-validators.ts";
import { duckConnectionOptionsConstraints as constraints } from "../core/duck-connection-options-constraints.ts";
import { duckValidatorsZod } from "./duck-validators-zod.ts";

export const duckAllConnectionOptionsZodSchema = z.strictObject({
  accessMode: z.optional(z.enum(constraints.accessMode.values)),
  compress: z.optional(z.boolean()),
  type: z.optional(z.enum(constraints.type.values)),
  blockSize: z.optional(
    z.int32().min(constraints.blockSize.min).max(constraints.blockSize.max)
  ),
  rowGroupSize: z.optional(z.int32().min(constraints.rowGroupSize.min)),
  storageVersion: z.optional(
    z
      .string()
      .startsWith(constraints.storageVersion.prefix)
      .regex(constraints.storageVersion.pattern)
  ),
  encryptionKey: z.optional(
    z.string().min(constraints.encryptionKey.minLength)
  ),
  encryptionCipher: z.optional(z.enum(constraints.encryptionCipher.values)),
  // Attach the database file.db with WAL writes disabled for improved performance:
  recoveryMode: z.optional(z.enum(constraints.recoveryMode.values)),
});

export type DuckAllConnectionOptionsZodSchema = z.infer<
  typeof duckAllConnectionOptionsZodSchema
>;

export const duckConnectionParamsZodSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("memory"),
    alias: duckValidatorsZod.aliasName,
    options: z.optional(duckAllConnectionOptionsZodSchema),
  }),
  z.strictObject({
    type: z.literal("filesystem"),
    path: z
      .string()
      .refine(isSafeDbFilename, { message: duckDbPathMessages.filename })
      .refine(isSafeDbPathname, { message: duckDbPathMessages.pathname }),
    alias: duckValidatorsZod.aliasName,
    options: z.optional(duckAllConnectionOptionsZodSchema),
  }),
]);

export type DuckConnectionParamsZodSchema = z.infer<
  typeof duckConnectionParamsZodSchema
>;
