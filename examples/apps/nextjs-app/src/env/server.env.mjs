// @ts-check
import { duckDsnZodSchema } from "@flowblade/sqlduck/zod";
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

import { zDsn, zJdbcUrlDsnCompatible } from "./validators.utils.mjs";

export const serverEnv = createEnv({
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: process.env,
  server: {
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(10).optional(),
    DB_FLOWBLADE_MSSQL_JDBC: zJdbcUrlDsnCompatible
      .meta({
        description: "The JDBC connection string for the mssql database",
        example:
          "sqlserver://<SERVER>.database.windows.net:1433;database=<DATABASE>;authentication=azure-active-directory-msi-app-service;clientId=<CLIENT_ID>;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30",
      })
      .optional(),
    DB_FLOWBLADE_POSTGRES_DSN: zDsn.optional(),
    DUCKDB_EXTENSION_DIRECTORY: z.string().optional(),
    DUCKDB_FLOWBLADE_DB_DSN: duckDsnZodSchema
      .meta({
        description: "The flowblade main duckdb database.",
        example: `
           disk:   'duckdb://filesystem/flowblade_db?path=/tmp/referential.db&accessMode=READ_WRITE' 
           memory: 'duckdb://memory/flowblade_db?accessMode=READ_WRITE&compress=true'
          `,
      })
      .optional(),
    DUCKDB_MEMORY_LIMIT: z
      .string()
      .regex(/^[1-9]\d*(MB|GB)$/)
      .meta({
        description:
          'Memory limit for DuckDB connections. Must be a string with a number followed by MB or GB, e.g. "512MB" or "2GB".',
      })
      .optional(),
    DUCKDB_TEMP_DIRECTORY: z.string().optional(),
    /** Duckdb global configuration */
    DUCKDB_THREADS: z
      .string()
      .regex(/^[1-9]\d*$/)
      .meta({
        description:
          "Number of threads to use for DuckDB connections. Must be a string as per duckdb driver",
      })
      .optional(),
    MOTHERDUCK_READ_SCALING_TOKEN: z.string().min(10).optional(),
    MOTHERDUCK_TOKEN: z.string().min(10).optional(),
    NEXT_CONFIG_COMPRESS: z.enum(["true", "false"]).default("false"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: z
      .enum(["http/json", "http/protobuf", "grpc"])
      .optional(),
    OTEL_EXPORTER_OTLP_PROTOCOL: z
      .enum(["http/json", "http/protobuf", "grpc"])
      .optional(),
  },
});
