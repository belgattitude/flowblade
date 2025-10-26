// @ts-check

const { defineConfig } = require('npm-check-updates');

// @todo read the content from .yarnrc.yml
const npmPreapprovedPackages = [
  '@belgattitude/*',
  '@flowblade/*',
  '@httpx/*',
  'next',
  '@next/*',
  '@azure/*',
  'prisma',
  '@prisma/*',
  '@duckdb/*',
  'turbo',
  'vite',
  'vitest',
  '@vitest/*',
  '@sentry/*',
  '@sentry-internal/*'
];

module.exports = defineConfig({
  workspaces: true,
  mergeConfig: true,
  root: true,
  packageManager: 'yarn',
  cooldown: (packageName) => {
    if (
      npmPreapprovedPackages.some((allowed) =>
      {
          if (allowed.endsWith('/*')) {
           return packageName.startsWith(allowed.slice(0, -2));
          } else {
            return packageName === allowed;
          }
      })
    ) {
      return 0;
    }
    return 2;
  },
  reject: [
    // Cause v9 isn't yet supported
    'eslint',

    // Cause flowblade does not yet support latest typescript-result
    'typescript-result',
    'recharts',

    // duckdb-wasm depends on an older version of arrow
    'apache-arrow',

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
});
