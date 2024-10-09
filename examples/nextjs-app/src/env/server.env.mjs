// @ts-check
import { isParsableDsn } from '@httpx/dsn-parser';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    DB_FLOWBLADE_AZURE_SQL_EDGE_JDBC: z.string().min(1),
    DB_FLOWBLADE_MYSQL_DSN: z.custom(
      (dsn) => isParsableDsn(dsn),
      'Invalid DSN format.'
    ),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  // },
  // For Next.js >= 13.4.4, you can just reference process.env:
  experimental__runtimeEnv: process.env,
});
