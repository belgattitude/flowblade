// @ts-check
import { isParsableDsn } from '@httpx/dsn-parser';
import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';

const zDsn = v.custom((dsn) => isParsableDsn(dsn), 'Invalid DSN format.');

export const serverEnv = createEnv({
  server: {
    NEXT_CONFIG_COMPRESS: v.picklist(['true', 'false']),
    SENTRY_ORG: v.optional(v.string()),
    SENTRY_PROJECT: v.optional(v.string()),
    DB_FLOWBLADE_MSSQL_JDBC: v.optional(v.string()),
    DB_FLOWBLADE_MARIADB_DSN: v.optional(zDsn),
    DB_FLOWBLADE_POSTGRES_DSN: v.optional(zDsn),
    BLOB_READ_WRITE_TOKEN: v.optional(v.pipe(v.string(), v.minLength(10))),
    MOTHERDUCK_READ_SCALING_TOKEN: v.optional(
      v.pipe(v.string(), v.minLength(10))
    ),
    MOTHERDUCK_TOKEN: v.optional(v.pipe(v.string(), v.minLength(10))),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  // },
  // For Next.js >= 13.4.4, you can just reference process.env:
  experimental__runtimeEnv: process.env,
});
