// @ts-check
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const buildEnv = createEnv({
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: process.env,
  server: {
    NEXT_BUILD_IGNORE_ESLINT: z.enum(["true", "false"]),
    NEXT_BUILD_IGNORE_TYPECHECK: z.enum(["true", "false"]),
    NEXT_BUILD_OUTPUT: z.enum(["export", "standalone"]).optional(),
    NEXT_BUILD_PRODUCTION_SOURCEMAPS: z.enum(["true", "false"]),
    NEXT_BUILD_TSCONFIG: z.string().optional(),
  },
});
