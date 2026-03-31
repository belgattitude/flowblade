import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '3kb',
  },
  {
    name: 'Import { QResult } (ESM)',
    path: ['dist/index.js'],
    import: '{ QResult }',
    limit: '3kb',
  },

] satisfies SizeLimitConfig;

export default config;