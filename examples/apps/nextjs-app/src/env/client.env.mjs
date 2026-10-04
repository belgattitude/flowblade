// @ts-check

/*
 * Please avoid to use zod default and/or coercion.
 *
 * Default should live under the main Next.js committed ".env" file.
 * As coercion is only available when passing through
 * createEnv it might create some ambiguities between env consumers
 * and create tree-shakability issues.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED: z.enum(["true", "false"]),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED:
      process.env.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED,
  },
});
