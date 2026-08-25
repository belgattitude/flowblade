import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  plugins: [],
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    "**/types.d/env.d.ts",
    ".kubb",
    "**/generated/**",
  ],
  rules: {
    "unicorn/filename-case": "off",
    "promise/prefer-await-to-then": "off",
    "typescript/no-extraneous-class": "off",
    "no-use-before-define": "off",
    "import/no-mutable-exports": "off",
    "no-promise-executor-return": "off",
    "func-style": "off",
    "promise/prefer-await-to-callbacks": "off",
    "no-shadow": "off",
    "typescript/no-non-null-assertion": "off",
    "unicorn/prefer-number-coercion": "off",
    "promise/no-promise-in-callback": "off",
    "require-await": "off",
    "sort-keys": "off",
  },
});
