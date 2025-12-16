import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '2000B',
  },
  {
    name: 'Only { SqlDuck } (ESM)',
    path: ['dist/index.mjs'],
    import: '{ SqlDuck }',
    limit: '1000B',
  },
] satisfies SizeLimitConfig;
