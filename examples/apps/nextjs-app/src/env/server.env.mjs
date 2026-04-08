// @ts-check
import { duckDsnValibotSchema } from '@flowblade/sqlduck/valibot';
import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';

import { vDsn, vJdbcUrlDsnCompatible } from './validators.utils.mjs';

export const serverEnv = createEnv({
  server: {
    NEXT_CONFIG_COMPRESS: v.optional(v.picklist(['true', 'false']), 'false'),
    SENTRY_ORG: v.optional(v.string()),
    SENTRY_PROJECT: v.optional(v.string()),
    DB_FLOWBLADE_MSSQL_JDBC: v.optional(
      v.pipe(
        vJdbcUrlDsnCompatible,
        v.string(),
        v.metadata({
          description: 'The JDBC connection string for the mssql database',
          example:
            'sqlserver://<SERVER>.database.windows.net:1433;database=<DATABASE>;authentication=azure-active-directory-msi-app-service;clientId=<CLIENT_ID>;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30',
        })
      )
    ),
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

    DUCKDB_FLOWBLADE_DB_DSN: v.optional(
      v.pipe(
        v.string(),
        duckDsnValibotSchema,
        v.metadata({
          description: 'The flowblade main duckdb database.',
          example: `
           disk:   'duckdb://filesystem/flowblade_db?path=/tmp/referential.db&accessMode=READ_WRITE' 
           memory: 'duckdb://memory/flowblade_db?accessMode=READ_WRITE&compress=true'
          `,
        })
      )
    ),

    /** Duckdb global configuration */
    DUCKDB_THREADS: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^[1-9]\d*$/),
        v.metadata({
          description:
            'Number of threads to use for DuckDB connections. Must be a string as per duckdb driver',
        })
      )
    ),
    DUCKDB_MEMORY_LIMIT: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^[1-9]\d*(MB|GB)$/),
        v.metadata({
          description:
            'Memory limit for DuckDB connections. Must be a string with a number followed by MB or GB, e.g. "512MB" or "2GB".',
        })
      )
    ),
    DUCKDB_TEMP_DIRECTORY: v.optional(v.pipe(v.string())),
    DUCKDB_EXTENSION_DIRECTORY: v.optional(v.pipe(v.string())),
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
