import nextra from 'nextra';

import { buildEnv } from './src/env/build.env.mjs';

const output = buildEnv.NEXT_BUILD_OUTPUT ?? undefined;
/** Useful when you publish the static export in a different basePath, ie gh-pages */
const basePath = process.env.NEXT_BUILD_BASE_PATH ?? undefined;

const withNextra = nextra({
  // contentDirBasePath: '/',
});

export default withNextra({
  ...(basePath ? { basePath } : {}),
  ...(output ? { output } : {}),
  eslint: {
    ignoreDuringBuilds: buildEnv.NEXT_BUILD_IGNORE_ESLINT === 'true',
  },
  productionBrowserSourceMaps:
    buildEnv.NEXT_BUILD_PRODUCTION_SOURCEMAPS === 'true',
  typescript: {
    ignoreBuildErrors: buildEnv.NEXT_BUILD_IGNORE_TYPECHECK === 'true',
    tsconfigPath: buildEnv.NEXT_BUILD_TSCONFIG,
  },
});
