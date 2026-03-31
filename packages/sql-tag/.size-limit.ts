import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.js'],
    import: '*',
    limit: '1000B',
  },
  {
    name: 'Only { sql } (ESM)',
    path: ['dist/index.js'],
    import: '{ sql }',
    limit: '700B',
  },
] satisfies SizeLimitConfig;

export default config;
