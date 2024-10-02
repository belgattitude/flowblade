import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const clientEnv = createEnv({
  client: {
    // Keep strings as env vars aren't necessarily consumed through t3-env / zod coercion
    NEXT_PUBLIC_ENABLE_HYDRATION_OVERLAY: z.enum(['true', 'false']),
  },
  runtimeEnv: {
    NEXT_PUBLIC_ENABLE_HYDRATION_OVERLAY:
      process.env.NEXT_PUBLIC_ENABLE_HYDRATION_OVERLAY,
  },
});
