import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ['es2015'],
    },
    cjs: {
      target: ['node20'],
    },
  },
  platform: 'node',
  unbundle: true,
});
