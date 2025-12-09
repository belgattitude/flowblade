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
    // optional overrides per project
    'sonarjs/todo-tag': 'off',
  },
};
