import nextra from 'nextra';

const withNextra = nextra({
  // contentDirBasePath: './src/content'
});

export default withNextra({
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
});
