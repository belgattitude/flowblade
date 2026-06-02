import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '11kb',
  },
] satisfies SizeLimitConfig;

export default config;