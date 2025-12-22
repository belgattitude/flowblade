import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ['node20'],
    },
    cjs: {
      target: ['node20'],
    },
  },
  platform: 'node',
  treeshake: true,
  exports: false,
  minify: 'dce-only',
  unbundle: false,
});
