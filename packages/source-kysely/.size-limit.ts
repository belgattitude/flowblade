import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '10kb',
  },
] satisfies SizeLimitConfig;
