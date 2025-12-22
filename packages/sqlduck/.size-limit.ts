import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '30Kb',
  },
  {
    name: 'Only { SqlDuck } (ESM)',
    path: ['dist/index.mjs'],
    import: '{ SqlDuck }',
    limit: '30Kb',
  },
] satisfies SizeLimitConfig;
