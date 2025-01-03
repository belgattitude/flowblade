import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const testFiles = ['./src/**/*.test.{js,jsx,ts,tsx}'];
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    typecheck: {
      enabled: false,
    },
    // threads is good, vmThreads is faster (perf++) but comes with possible memory leaks
    // @link https://vitest.dev/config/#vmthreads
    pool: 'fork',
    environment: 'node',
    passWithNoTests: true,
    cache: {
      dir: '../../.cache/vitest/fastify-app',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'clover'],
      extension: ['js', 'jsx', 'ts', 'tsx'],
    },
    include: testFiles,
    css: false,
    // To mimic Jest behaviour regarding mocks.
    // @link https://vitest.dev/config/#clearmocks
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
});
