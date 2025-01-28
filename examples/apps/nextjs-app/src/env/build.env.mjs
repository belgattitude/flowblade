// @ts-check
import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';
export const buildEnv = createEnv({
  server: {
    NEXT_BUILD_OUTPUT: v.optional(v.picklist(['export', 'standalone'])),
    NEXT_BUILD_TSCONFIG: v.optional(v.string()),
    NEXT_BUILD_IGNORE_ESLINT: v.picklist(['true', 'false']),
    NEXT_BUILD_IGNORE_TYPECHECK: v.picklist(['true', 'false']),
    NEXT_BUILD_PRODUCTION_SOURCEMAPS: v.picklist(['true', 'false']),
  },
  experimental__runtimeEnv: process.env,
});
