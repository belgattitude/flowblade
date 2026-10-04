import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  plugins: [],
  rules: {
    // example/doc code is illustrative, boundary-parsing rules add noise here
    "anti-slop/no-runtime-typeof": "off",
    "anti-slop/no-conditional-empty-object-spread": "off",
    "anti-slop/no-chained-type-assertions": "off",
    "anti-slop/no-unsafe-dictionary-type": "off",
    "anti-slop/no-unknown-parameters": "off",
    "anti-slop/no-known-value-widening": "off",
    "unicorn/filename-case": "off",
    "promise/prefer-await-to-then": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-extraneous-class": "off",
    "typescript/strict-boolean-expressions": "off",
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
