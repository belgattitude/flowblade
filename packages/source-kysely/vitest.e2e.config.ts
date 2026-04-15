import { defineConfig } from 'vitest/config';

const testFiles = ['./tests/e2e/**/*.test.ts'];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // @link https://vitest.dev/config/#clearmocks
    clearMocks: true,
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
    passWithNoTests: false,
    restoreMocks: true,
  },
});
