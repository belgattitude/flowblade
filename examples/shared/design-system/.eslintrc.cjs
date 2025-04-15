/**
 * Specific eslint rules for this workspace, learn how to compose
 * @link https://github.com/belgattitude/perso/tree/main/packages/eslint-config-bases
 */

// Workaround for https://github.com/eslint/eslint/issues/3458
require('@belgattitude/eslint-config-bases/patch/modern-module-resolution');

const {
  getDefaultIgnorePatterns,
} = require('@belgattitude/eslint-config-bases/helpers');

module.exports = {
  extends: [
    '@belgattitude/eslint-config-bases/typescript',
    '@belgattitude/eslint-config-bases/simple-import-sort',
    '@belgattitude/eslint-config-bases/import-x',
    // '@belgattitude/eslint-config-bases/perfectionist',
    '@belgattitude/eslint-config-bases/sonar',
    '@belgattitude/eslint-config-bases/regexp',
    '@belgattitude/eslint-config-bases/vitest',

    // Group 2: Helps to avoid complexity (cyclomatic...)
    // '@belgattitude/eslint-config-bases/sonar',

    // Group 3: When working with react
    '@belgattitude/eslint-config-bases/react',
    '@belgattitude/eslint-config-bases/react-query',
    '@belgattitude/eslint-config-bases/rtl',
    // Apply prettier and disable incompatible rules
    '@belgattitude/eslint-config-bases/prettier-plugin',
  ],
  ignorePatterns: [...getDefaultIgnorePatterns(), '**/src/generated/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
  rules: {
    // Additional rules
  },
  overrides: [
    {
      files: ['*.tsx'],
      rules: {
        // Disable some rules to allow shadcn/ui
        'sonarjs/pseudo-random': 'off',
        'sonarjs/table-header': 'off',
        'sonarjs/no-nested-conditional': 'off',
        'unicorn/no-document-cookie': 'off',
        'unicorn/explicit-length-check': 'off',
        'jsx-a11y/anchor-has-content': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
      },
    },
  ],
};
