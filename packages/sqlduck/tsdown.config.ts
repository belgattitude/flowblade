import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/validation/zod/index.ts',
    './src/validation/valibot/index.ts',
  ],
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ['node20'],
    },
  },
  platform: 'node',
  treeshake: true,
  exports: false,
  minify: 'dce-only',
  unbundle: false,
});
