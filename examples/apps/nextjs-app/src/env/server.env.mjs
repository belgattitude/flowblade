// @ts-check
import { isParsableDsn } from '@httpx/dsn-parser';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zDsn = z.custom((dsn) => isParsableDsn(dsn), 'Invalid DSN format.');

export const serverEnv = createEnv({
  server: {
    NEXT_CONFIG_COMPRESS: z.enum(['true', 'false']),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    DB_FLOWBLADE_SQLSERVER_JDBC: z.string().optional(),
    DB_FLOWBLADE_MARIADB_DSN: zDsn.optional(),
    DB_FLOWBLADE_POSTGRES_DSN: zDsn.optional(),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  // },
  // For Next.js >= 13.4.4, you can just reference process.env:
  experimental__runtimeEnv: process.env,
});
