import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  attw: {
    profile: 'esm-only',
    level: 'error',
  },
  publint: {
    level: 'error',
  },
  dts: true,
  clean: true,
  format: {
    esm: {
      target: ["node22", ...browserslistToEsbuild()],
    },
  },
  platform: "neutral",
  treeshake: true,
  exports: false,
  minify: "dce-only",
  unbundle: false,
});
