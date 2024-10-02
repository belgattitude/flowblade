// @ts-check

const { getPrettierConfig } = require('@belgattitude/eslint-config-bases/helpers');

const { overrides = [], ...prettierConfig } = getPrettierConfig();

/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config =  {
  ...prettierConfig,
  overrides: [
    ...overrides,
    ...[
      {
        files: '*.md',
        options: {
          singleQuote: false,
          quoteProps: 'preserve',
        },
      },
    ],
  ],
};

module.exports = config;