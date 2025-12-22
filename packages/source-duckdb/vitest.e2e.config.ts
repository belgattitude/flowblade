import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const testFiles = ['./tests/e2e/**/*.test.ts'];

export default defineConfig({
  esbuild: {
    target: ['node20'],
  },
  plugins: [tsconfigPaths()],
  test: {
    globalSetup: './vitest.setup.ts',
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
    setupFiles: './tests/vitest.setup.ts',
    include: testFiles,
    // To mimic Jest behaviour regarding mocks.
    mockReset: true,
    passWithNoTests: false,
    restoreMocks: true,
  },
});
