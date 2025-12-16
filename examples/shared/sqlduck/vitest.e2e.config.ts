import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const testFiles = ['./tests/e2e/**/*.test.{js,jsx,ts,tsx}'];
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    typecheck: {
      enabled: false,
    },
    environment: 'node',
    passWithNoTests: true,
    setupFiles: './tests/vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'clover'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
    },
    include: testFiles,
    // you might want to disable it, if you don't have tests that rely on CSS
    // since parsing CSS is slow
    // css: true,
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
