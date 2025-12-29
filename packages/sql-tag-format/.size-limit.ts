import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '55KB',
  },
  {
    name: 'Only { SqlFormatter } (ESM)',
    path: ['dist/index.js'],
    import: '{ SqlFormatter }',
    limit: '55Kb',
  },
] satisfies SizeLimitConfig;
