import { oxfmtDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxfmt";

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
