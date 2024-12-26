import type { SizeLimitConfig } from 'size-limit'

module.exports = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '1000B',
  },
  {
    name: 'Only { sql } (ESM)',
    path: ['dist/index.mjs'],
    import: '{ sql }',
    limit: '700B',
  },
] satisfies SizeLimitConfig;
