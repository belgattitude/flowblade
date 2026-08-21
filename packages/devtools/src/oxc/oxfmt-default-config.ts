import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export const oxfmtDefaultConfig = defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "docs/**/*.md",
    "CHANGELOG.md",
  ],
});
