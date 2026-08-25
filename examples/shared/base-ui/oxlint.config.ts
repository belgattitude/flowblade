import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  plugins: [],
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    "src/components/**",
  ],
  rules: {
    "sort-keys": "off",
  },
  overrides: [
    {
      files: ["**/*.stories.tsx"],
      rules: {
        "func-style": "off",
        "no-plusplus": "off",
        "require-await": "off",
      },
    },
  ],
});
