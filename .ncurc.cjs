// @ts-check

const { defineConfig } = require('npm-check-updates');

// @todo read the content from .yarnrc.yml
const npmPreapprovedPackagesPrefixes = [
  '@belgattitude/',
  '@flowblade/',
  '@httpx/',
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
    return 3;
  },
  reject: [
    // Cause v9 isn't yet supported
    'eslint',
    // Till support is done
    'typescript-result',


    // Examples apps
    'recharts', // till shadcn/ui supports v3
    'apache-arrow', // till duckdb wasm supports it
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
