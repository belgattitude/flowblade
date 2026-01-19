import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '62KB',
  },
  {
    name: 'Only { SqlFormatter } (ESM)',
    path: ['dist/index.js'],
    import: '{ SqlFormatter }',
    limit: '62Kb',
  },
] satisfies SizeLimitConfig;
