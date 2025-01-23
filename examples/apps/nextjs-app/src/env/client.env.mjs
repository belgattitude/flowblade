// @ts-check

/*
 * Please avoid to use zod default and/or coercion. Default should live under the
 * main Next.js committed ".env" file. As coercion is only avaible when passing through
 * createEnv it can create some ambiguities between tools consuming the env
 * and might create tree-shakability limits.
 */

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_SENTRY_ENABLED: z.enum(['true', 'false']),
    NEXT_PUBLIC_SPOTLIGHT_ENABLED: z.enum(['true', 'false']),
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED: z.enum(['true', 'false']),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_SPOTLIGHT_ENABLED: process.env.NEXT_PUBLIC_SPOTLIGHT_ENABLED,
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED:
      process.env.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED,
  },
});
