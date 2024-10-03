// @ts-check

import pc from 'tinyrainbow';

const trueEnv = ['true', '1', 'yes'];

const NEXTJS_IGNORE_ESLINT = trueEnv.includes(
  process.env?.NEXTJS_IGNORE_ESLINT ?? 'false'
);
const NEXTJS_IGNORE_TYPECHECK = trueEnv.includes(
  process.env?.NEXTJS_IGNORE_TYPECHECK ?? 'false'
);

const TYPESCRIPT_CONFIG = process.env.TSCONFIG ?? './tsconfig.json';

/** @type {import('next').NextConfig} */
let nextConfig = {
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: NEXTJS_IGNORE_ESLINT,
  },
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
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: NEXTJS_IGNORE_TYPECHECK,
    tsconfigPath: TYPESCRIPT_CONFIG,
  },
};

if (process.env.NEXT_PUBLIC_HYDRATION_OVERLAY === 'yes') {
  try {
    const { withHydrationOverlay } = await import(
      '@builder.io/react-hydration-overlay/next'
    ).then((mod) => mod);
    nextConfig = withHydrationOverlay({})(nextConfig);
    console.log(`- ${pc.green('info')} HydrationOverlay enabled`);
  } catch {
    // simply ignore
  }
}

if (
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' &&
  !process.env.TURBOPACK
) {
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

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

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

export default nextConfig;
