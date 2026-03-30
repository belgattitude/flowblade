import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '10kb',
  },
] satisfies SizeLimitConfig;

export default config;