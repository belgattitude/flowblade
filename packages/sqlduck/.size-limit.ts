import type { SizeLimitConfig } from 'size-limit'

const config = [
  {
    name: 'Import * (ESM)',
    path: ['dist/index.mjs'],
    import: '*',
    limit: '60Kb',
  },
  {
    name: 'Only { SqlDuck } (ESM)',
    path: ['dist/index.mjs'],
    import: '{ SqlDuck }',
    limit: '50Kb',
  },
] satisfies SizeLimitConfig;

export default config;