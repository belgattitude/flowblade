import {
  createOxlintReactConfig,
  oxlintDefaultConfig,
} from "@flowblade/devtools";
import { defineConfig } from "oxlint";

const reactConfig = createOxlintReactConfig({
  tailwindEntryPoint: "src/styles/globals.css",
});

// spread as the root config: oxlint does not merge the `settings` of an extended config
export default defineConfig({
  ...reactConfig,
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    "src/components/**",
  ],
  rules: {
    ...reactConfig.rules,
    // example/doc code is illustrative, boundary-parsing rules add noise here
    // "anti-slop/no-runtime-typeof": "off",
    // "anti-slop/no-conditional-empty-object-spread": "off",
    // "anti-slop/no-chained-type-assertions": "off",
    // "anti-slop/no-unsafe-dictionary-type": "off",
    // "anti-slop/no-unknown-parameters": "off",
    // "anti-slop/no-known-value-widening": "off",
    "sort-keys": "off",
  },
  overrides: [
    {
      files: ["**/*.stories.tsx"],
      rules: {
        "func-style": "off",
        "no-plusplus": "off",
        "require-await": "off",
        "typescript/no-misused-promises": "off",
        "typescript/strict-void-return": "off",
        "typescript/strict-boolean-expressions": "off",
        "typescript/no-unsafe-type-assertion": "off",
      },
    },
  ],
});
