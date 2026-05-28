import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/filesystem/index.ts',
    './src/validation/zod/index.ts',
    './src/validation/valibot/index.ts',
    './src/integrations/kysely/index.ts',
  ],
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ['node22'],
    },
  },
  platform: 'node',
  treeshake: true,
  exports: false,
  minify: 'dce-only',
  unbundle: false,
});
