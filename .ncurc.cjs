// @ts-check

const { defineConfig } = require('npm-check-updates');

// @todo read the content from .yarnrc.yml
const npmPreapprovedPackagesPrefixes = [
  '@belgattitude/',
  '@flowblade/',
  '@httpx/',
  'next',
  '@next/',
  '@azure/',
  'prisma',
  '@prisma/',
  '@duckdb/',
  'turbo',
  '@sentry/',
  '@sentry-internal/'
];

module.exports = defineConfig({
  workspaces: true,
  mergeConfig: true,
  root: true,
  packageManager: 'yarn',
  cooldown: (packageName) => {
    if (
      npmPreapprovedPackagesPrefixes.some((prefix) =>
        packageName.startsWith(prefix)
      )
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

    'apache-arrow',

    // Till @vercel/otel support offers support for v2
    '@opentelemetry/api',
    '@opentelemetry/api-logs',
    '@opentelemetry/instrumentation',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-logs',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/sdk-trace-base'
  ],
});
