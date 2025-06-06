// @ts-check

import path from 'node:path';
import url from 'node:url';

import pc from 'tinyrainbow';

import { buildEnv } from './src/env/build.env.mjs';
import { clientEnv } from './src/env/client.env.mjs';
import { serverEnv } from './src/env/server.env.mjs';

const _isDev = process.env.NODE_ENV === 'development';
const _isTurbo = process.env.TURBOPACK !== undefined;
const buildOutput = buildEnv.NEXT_BUILD_OUTPUT ?? undefined;

const monorepoRoot = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);

/** @type {import('next').NextConfig} */
let nextConfig = {
  compress: serverEnv.NEXT_CONFIG_COMPRESS === 'true',
  ...(buildOutput === undefined ? {} : { output: buildOutput }),
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: buildEnv.NEXT_BUILD_IGNORE_ESLINT === 'true',
  },
  // transpilePackages: ['@duckdb/duckdb-wasm'],
  serverExternalPackages: [
    '@duckdb/node-api',
    '@duckdb/node-bindings',
    'tedious',
    'mssql',
    'tarn',
  ],
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    // Prefer loading of ES Modules over CommonJS
    // @link {https://nextjs.org/blog/next-11-1#es-modules-support|Blog 11.1.0}
    // @link {https://github.com/vercel/next.js/discussions/27876|Discussion}
    esmExternals: true,
    // Experimental monorepo support
    // @link {https://github.com/vercel/next.js/pull/22867|Original PR}
    // @link {https://github.com/vercel/next.js/discussions/26420|Discussion}
    externalDir: true,
  },

  turbopack: {
    rules: {
      '*.wasm': {
        loaders: [
          {
            loader: 'file-loader',
            options: {
              esModule: true,
            },
          },
        ],
        as: '*.js',
      },
    },
  },

  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.wasm/,
      loader: 'file-loader',
      options: {},
    });

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true, // Enable async WebAssembly support
    };

    // config.module.rules.push({
    //   test: /\.wasm$/,
    //   type: 'asset/resource', // Treat .wasm files as assets
    // });
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  productionBrowserSourceMaps:
    buildEnv.NEXT_BUILD_PRODUCTION_SOURCEMAPS === 'true',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: buildEnv.NEXT_BUILD_IGNORE_TYPECHECK === 'true',
    tsconfigPath: buildEnv.NEXT_BUILD_TSCONFIG,
  },
};

if (clientEnv.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  try {
    const { withSentryConfig } = await import('@sentry/nextjs').then(
      (mod) => mod
    );
    nextConfig = withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: '/monitoring',

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,
    });
    console.log(`- ${pc.green('info')} Sentry integration enabled`);
  } catch {
    console.log(`- ${pc.red('error')} Sentry integration registration failed`);
  }
} else {
  console.log(`- ${pc.green('info')} Sentry integration not enabled`);
}

if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = await import('@next/bundle-analyzer').then(
      (mod) => mod.default
    );
    nextConfig = withBundleAnalyzer({
      enabled: true,
    })(nextConfig);
  } catch {
    // Do nothing, @next/bundle-analyzer is probably purged in prod or not installed
  }
}
export default nextConfig;
