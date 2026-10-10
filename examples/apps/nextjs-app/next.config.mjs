// @ts-check

import path from "node:path";

import packageJson from "./package.json" with { type: "json" };
import { buildEnv } from "./src/env/build.env.mjs";
import { serverEnv } from "./src/env/server.env.mjs";

const _isDev = process.env.NODE_ENV === "development";
const buildOutput = buildEnv.NEXT_BUILD_OUTPUT ?? undefined;

const monorepoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compress: serverEnv.NEXT_CONFIG_COMPRESS === "true",
  ...(buildOutput === undefined ? {} : { output: buildOutput }),
  // transpilePackages: ['@duckdb/duckdb-wasm'],
  serverExternalPackages: [
    "@duckdb/node-api",
    "@duckdb/node-bindings",
    "@duckdb/node-bindings-linux-x64",
    "tedious",
    "mssql",
    "tarn",
  ],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    // Since nextjs 16 turbopack in standalone mode (vercel included)
    // the tracing of the libduckdb.so is broken although duckdb.node is
    // correctly traced (included).
    // This bug might be more general and impact optional dependencies
    "/api/\\[\\[\\.\\.\\.route\\]\\]": [
      "../../../node_modules/@duckdb/node-bindings-*/*.so",
      "../../../node_modules/@duckdb/node-bindings-*/*.node",
      "../../../node_modules/@duckdb/node-bindings-*/*.dylib",
      "../../../node_modules/@duckdb/node-bindings-*/*.dll",
    ],
  },
  experimental: {
    // Prefer loading of ES Modules over CommonJS
    // @link {https://nextjs.org/blog/next-11-1#es-modules-support|Blog 11.1.0}
    // @link {https://github.com/vercel/next.js/discussions/27876|Discussion}
    // esmExternals: true,
    // Experimental monorepo support
    // @link {https://github.com/vercel/next.js/pull/22867|Original PR}
    // @link {https://github.com/vercel/next.js/discussions/26420|Discussion}
    // externalDir: true,

    turbopackRustReactCompiler: true,
    // see https://nextjs.org/blog/next-16-2-turbopack#lightning-css-configuration
    useLightningcss: true,
    lightningCssFeatures: {
      exclude: ["nesting"],
      include: ["light-dark", "oklab-colors"],
    },
  },
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      // See https://github.com/shadcn-ui/cn
      clsx: "cn",
      "tailwind-merge": "cn",
    },
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
        source: "/:path*",
      },
    ];
  },
  productionBrowserSourceMaps:
    buildEnv.NEXT_BUILD_PRODUCTION_SOURCEMAPS === "true",
  reactStrictMode: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: buildEnv.NEXT_BUILD_IGNORE_TYPECHECK === "true",
    tsconfigPath: buildEnv.NEXT_BUILD_TSCONFIG,
  },
  env: {
    APP_NAME: packageJson.name,
    APP_VERSION: packageJson.version,
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
