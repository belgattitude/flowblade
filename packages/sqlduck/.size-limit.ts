import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '40Kb',
  },
  {
    name: 'Only { SqlDuck } (ESM)',
    path: ['dist/index.mjs'],
    import: '{ SqlDuck }',
    limit: '30Kb',
  },
] satisfies SizeLimitConfig;

export default config;