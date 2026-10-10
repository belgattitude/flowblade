import { oxfmtDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...oxfmtDefaultConfig,
  sortTailwindcss: {
    ...(typeof oxfmtDefaultConfig.sortTailwindcss === "object"
      ? oxfmtDefaultConfig.sortTailwindcss
      : {}),
    // the app theme, so classes are sorted in the same order as tailwindcss/enforce-sort-order
    stylesheet: "./src/styles/globals.css",
  },
});
