import type { SizeLimitConfig } from 'size-limit'

const config = [
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

export default config;