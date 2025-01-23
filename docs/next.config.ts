import nextra from 'nextra';

/** Useful when you publish the static export in a different basePath, ie gh-pages */
const basePath = process.env.NEXT_BUILD_ENV_BASE_PATH ?? undefined;

const withNextra = nextra({
  // contentDirBasePath: './src/content'
});

export default withNextra({
  ...(basePath ? { basePath } : {}),
  output: 'export',
  images: {
    unoptimized: true, // mandatory, otherwise won't export
  },
  productionBrowserSourceMaps:
    process.env.NEXT_BUILD_ENV_SOURCEMAPS !== 'false',
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_BUILD_ENV_LINT === 'false',
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_BUILD_ENV_TYPECHECK === 'false',
  },
});
