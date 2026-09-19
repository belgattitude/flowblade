import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const testFiles = ["./src/**/*.test.{js,jsx,ts,tsx}"];
export default defineConfig({
  cacheDir: "../../../.cache/vitest/base-ui",
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globalSetup: "./vitest.setup.ts",
    globals: true,
    typecheck: {
      enabled: false,
    },
    environment: "happy-dom",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "clover"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
    },
    include: testFiles,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});
