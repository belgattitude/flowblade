// @ts-check

/*
 * Please avoid to use valibot default and/or coercion.
 *
 * Default should live under the main Next.js committed ".env" file.
 * As coercion is only available when passing through
 * createEnv it might create some ambiguities between env consumers
 * and create tree-shakability issues.
 */

import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_SENTRY_ENABLED: v.picklist(['true', 'false']),
    NEXT_PUBLIC_SPOTLIGHT_ENABLED: v.picklist(['true', 'false']),
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED: v.picklist(['true', 'false']),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_SPOTLIGHT_ENABLED: process.env.NEXT_PUBLIC_SPOTLIGHT_ENABLED,
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED:
      process.env.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED,
  },
  emptyStringAsUndefined: true,
});
