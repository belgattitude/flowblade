// @ts-check

/**
 * No `cooldown` here: ncu reads `minimumReleaseAge` / `minimumReleaseAgeExclude`
 * from pnpm-workspace.yaml when it's not set (only package-name patterns are
 * honored, `pkg@version` excludes are ignored).
 *
 * @type {import('npm-check-updates').RcOptions}
 */
export default {
  workspaces: true,
  mergeConfig: true,
  root: true,
  packageManager: "pnpm",
  reject: [
    // cause v11 removed some useful components
    "primereact",

    // duckdb-wasm depends on an older version of arrow
    "apache-arrow",

    // prisma
    //'prisma',
    //'@prisma/client',

    "@sentry/nextjs",

    // Depending on v1/v2 support you might want to disable these updates
    /*
    '@opentelemetry/api',
    '@opentelemetry/api-logs',
    '@opentelemetry/instrumentation',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-logs',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/sdk-trace-base'
     */
  ],
};
