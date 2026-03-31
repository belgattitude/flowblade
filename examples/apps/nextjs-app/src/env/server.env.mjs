// @ts-check
import { isParsableDuckDsnZod } from '@flowblade/sqlduck/zod';
import { isParsableDsn } from '@httpx/dsn-parser';
import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';

const vDsn = v.custom((dsn) => isParsableDsn(dsn), 'Invalid DSN format.');
const vDuckDsn = v.custom(
  (dsn) => isParsableDuckDsnZod(dsn),
  'Invalid DuckDB DSN format.'
);
export const serverEnv = createEnv({
  server: {
    NEXT_CONFIG_COMPRESS: v.optional(v.picklist(['true', 'false']), 'false'),
    SENTRY_ORG: v.optional(v.string()),
    SENTRY_PROJECT: v.optional(v.string()),
    DB_FLOWBLADE_MSSQL_JDBC: v.optional(v.string()),
    DB_FLOWBLADE_MARIADB_DSN: v.optional(vDsn),
    DB_FLOWBLADE_POSTGRES_DSN: v.optional(vDsn),
    BETTER_AUTH_SECRET: v.optional(v.pipe(v.string(), v.minLength(32))),
    BLOB_READ_WRITE_TOKEN: v.optional(v.pipe(v.string(), v.minLength(10))),
    MOTHERDUCK_READ_SCALING_TOKEN: v.optional(
      v.pipe(v.string(), v.minLength(10))
    ),
    MOTHERDUCK_TOKEN: v.optional(v.pipe(v.string(), v.minLength(10))),
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: v.optional(
      v.picklist(['http/json', 'http/protobuf', 'grpc'], 'http/json')
    ),
    OTEL_EXPORTER_OTLP_PROTOCOL: v.optional(
      v.picklist(['http/json', 'http/protobuf', 'grpc'], 'http/json')
    ),
    OTEL_EXPORTER_OTLP_ENDPOINT: v.optional(v.pipe(v.string(), v.url())),
    DUCKDB_MAIN_DB_DSN: vDuckDsn,
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
