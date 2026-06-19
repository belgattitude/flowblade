import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '4kb',
  },
  {
    name: 'Import { QResult } (ESM)',
    path: ['dist/index.js'],
    import: '{ QResult }',
    limit: '4kb',
  },

] satisfies SizeLimitConfig;

export default config;