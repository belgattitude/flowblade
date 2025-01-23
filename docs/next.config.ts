import nextra from 'nextra';

const withNextra = nextra({
  // contentDirBasePath: './src/content'
});

export default withNextra({
  output: 'export',
  images: {
    unoptimized: true, // mandatory, otherwise won't export
  },
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
});
