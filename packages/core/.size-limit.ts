import type { SizeLimitConfig } from 'size-limit'

module.exports = [
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
