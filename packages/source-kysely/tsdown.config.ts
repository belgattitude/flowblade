import browserslistToEsbuild from 'browserslist-to-esbuild';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ['node20', ...browserslistToEsbuild()],
    },
    cjs: {
      target: ['node20', ...browserslistToEsbuild()],
    },
  },
  platform: 'neutral',
  treeshake: true,
  exports: false,
  minify: 'dce-only',
  unbundle: false,
});
