// @ts-check

/**
 * This files overrides the base lint-staged.config.js present in the root directory.
 * It allows to run eslint based the package specific requirements.
 * {@link https://github.com/okonet/lint-staged#how-to-use-lint-staged-in-a-multi-package-monorepo}
 * {@link https://github.com/belgattitude/nextjs-monorepo-example/blob/main/docs/about-lint-staged.md}
 */

import path from "node:path";
import url from "node:url";

import {
  concatFilesForPrettier,
  getEslintFixCmd,
} from "../../../lint-staged.common.mjs";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  "**/*.{js,jsx,ts,tsx}": (filenames) =>
    getEslintFixCmd({
      cache: true,
      cwd: __dirname,
      files: filenames,
      fix: true,
      maxWarnings: 25,
    }),
};
