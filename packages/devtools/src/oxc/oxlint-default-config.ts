import { defineConfig } from "oxlint";
import oxlintTailwindcss from "oxlint-tailwindcss";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";
//import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

import { defaultIgnorePatterns } from "./default-ignore-patterns.ts";

export const oxlintDefaultConfig = defineConfig({
  extends: [
    core,
    vitest,
    tanstack,
    //tanstackJsPlugins,
    antiSlop,
    selectJsPlugins([]),
  ],
  jsPlugins: ["eslint-plugin-security", "oxlint-tailwindcss"],
  options: {
    typeAware: true,
    typeCheck: false,
  },
  ignorePatterns: [...defaultIgnorePatterns],
  settings: jsPluginSettings,
  overrides: [
    {
      files: ["*.ts", "*.js", "*.mjs", "*.cjs"],
      rules: {
        "security/detect-bidi-characters": "error",
        "security/detect-invisible-characters": "error",
        "security/detect-buffer-noassert": "error",
        "security/detect-eval-with-expression": "error",
        "security/detect-new-buffer": "error",
        "security/detect-non-literal-require": "error",
        "security/detect-child-process": "error",

        "tailwindcss/no-conflicting-classes": "error",
        "tailwindcss/enforce-sort-order": "off",

        // this breaks: unicorn(text-encoding-identifier-case): Prefer `utf-8` over `utf8`.
        "unicorn/text-encoding-identifier-case": "off",
        // this breaks: eslint(prefer-named-capture-group)
        "prefer-named-capture-group": "off",
        "promise/avoid-new": "off",
        "jsdoc/require-param-description": "off",
        "jsdoc/require-throws-type": "off",
        "require-unicode-regexp": "off",
        "no-plusplus": "off",
        //"prefer-spread": "off",
        //"unicorn/prefer-spread": "off",
        "class-methods-use-this": "off",
        //"prefer-destructuring": "off",
        //"preserve-caught-error": "off",
        "prefer-template": "off",
        "no-useless-rename": "off",
        "no-unsafe-type-assertion": "off",
        "no-confusing-void-expression": "off",
        //"prefer-readonly": "off",
        //"strict-boolean-expressions": "off",
        //"strict-void-return": "off",
        "no-unnecessary-type-parameters": "off",
        "switch-exhaustiveness-check": "off",
        "no-unnecessary-boolean-literal-compare": "off",
        "no-unnecessary-template-expression": "off",
        "no-deprecated": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        // 'anti-slop/no-unsafe-dictionary-type': 'off',
        //"require-yields": "off",
        "no-non-null-assertion": "off",
        "no-array-for-each": "off",
        "func-style": "off",
        "no-inline-comments": "off",
        curly: "off",
        "sort-keys": "off",
        "no-unused-vars": "off",
        "operator-assignment": "off",
        "object-shorthand": "off",
        "arrow-body-style": "off",
        "require-await": "off",
        //"import/newline-after-import": "off",
        "import/consistent-type-specifier-style": "off",
        //'import/newline-after-import': 'off'
        // 'sonarjs/no-wildcard-import': 'off',
        "consistent-type-definitions": "off",
        "no-shadow": "off",
        "no-warning-comments": "off",
        "unicorn/catch-error-name": "off",
        complexity: "off",
        "no-explicit-any": "off",
        "unicorn/switch-case-braces": "off",
        "no-await-in-loop": "off",
        "unicorn/filename-case": "off",
        "unicorn/consistent-function-scoping": "off",
        //'arrow-body-style': 'off',
        //"unicorn/prefer-import-meta-properties": "off",
        //'no-useless-return': 'off',
        "jsdoc/check-tag-names": "off",
        "unicorn/numeric-separators-style": "off",
      },
    },
    {
      files: ["*.test.ts", "*.spec.ts"],
      plugins: ["vitest"],
      rules: {
        "no-deprecated": "off", // todo enable
        "unicorn/no-useless-undefined": "off",
        "unicorn/prefer-bigint-literals": "off",
        "func-name-matching": "off",
        // test helpers are declared next to the tests using them (inside describe/it), hoisting them hurts readability
        "unicorn/consistent-function-scoping": "off",
        // fixtures and mocks are asserted non-null (`rows[0]!`) all over the tests, a failure there is an assertion error anyway
        "typescript/no-non-null-assertion": "off",
        "require-unicode-regexp": "off",
        "no-unsafe-type-assertion": "off",
        "no-unsafe-member-access": "off",
        "strict-boolean-expressions": "off",
        "no-unsafe-assignonment": "off",
        "prefer-named-capture-group": "off",
        "vitest/expect-expect": "error",
        "vitest/max-expects": "off",
        "vitest/no-mocks-import": "error",
        "vitest/no-standalone-expect": "error",
        "vitest/no-unneeded-async-expect-function": "error",
        "vitest/prefer-called-exactly-once-with": "error",
        // a hint renames every snapshot key, forcing a full snapshot rewrite
        "vitest/prefer-snapshot-hint": "error",
        "vitest/no-identical-title": "error",
        "vitest/no-import-node-test": "error",
        "vitest/prefer-to-be": "error",
        "vitest/no-conditional-expect": "error",
        // `toBe(true)` is stricter than `toBeTruthy()`
        "vitest/prefer-to-be-truthy": "off",
        "vitest/prefer-to-be-falsy": "off",
        "vitest/prefer-importing-vitest-globals": "off",
        // false positive when the described subject isn't a function
        "vitest/prefer-describe-function-title": "off",
        // typed `import()` mocks reject partial module mocks
        "vitest/prefer-import-in-mock": "off",
      },
    },
    {
      files: ["*.tsx", "*.jsx"],
      rules: {
        "anti-slop/require-safety-comment-for-type-assertion": "off",
      },
    },
    {
      // Test, bench and script code builds fixtures and mocks, so anti-slop's
      // boundary-parsing rules add noise rather than safety there.
      files: [
        "*.test.ts",
        "*.spec.ts",
        "**/tests/**",
        "**/bench/**",
        "**/scripts/**",
      ],
      rules: {
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "anti-slop/no-chained-type-assertions": "off",
        "anti-slop/no-runtime-typeof": "off",
        "anti-slop/no-unsafe-dictionary-type": "off",
        "anti-slop/no-unknown-parameters": "off",
        "anti-slop/no-unknown-returns": "off",
        "anti-slop/no-known-value-widening": "off",
        "anti-slop/no-module-mocking": "off",
      },
    },
  ],
});
