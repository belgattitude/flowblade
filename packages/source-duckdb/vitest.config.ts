import codspeedPlugin from '@codspeed/vitest-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const testFiles = [
  './src/**/*.test.{js,ts}',
  './test/**/*.test.{js,ts}',
  './e2e/**/*.test.ts',
];

const isCodeSpeedEnabled = process.env?.CODSPEED === '1';
const cspeed = isCodeSpeedEnabled ? codspeedPlugin() : undefined;

export default defineConfig({
  esbuild: {
    target: ['node18'],
  },
  plugins: [tsconfigPaths(), ...[cspeed].filter(Boolean)],
  cacheDir: '../../.cache/vite/source-kysely',
  test: {
    // @link https://vitest.dev/config/#clearmocks
    clearMocks: true,
    coverage: {
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      provider: 'istanbul',
      reporter: ['text', 'json', 'clover'],
    },
    benchmark: {
      reporters: ['default'],
      outputJson: './bench/output/benchmark-results.json',
    },
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      'dist/**',
      '**/coverage/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    globals: true,
    include: testFiles,
    // To mimic Jest behaviour regarding mocks.
    mockReset: true,
    passWithNoTests: true,
    restoreMocks: true,
  },
});
