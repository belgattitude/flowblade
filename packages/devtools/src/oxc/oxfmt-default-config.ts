import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import { defaultIgnorePatterns } from "./default-ignore-patterns.ts";

const { ignorePatterns: _ignorePatterns, ...restUltracite } = ultracite;

export const oxfmtDefaultConfig = defineConfig({
  ...restUltracite,
  "printWidth": 80,
  "proseWrap": "always",
  "embeddedLanguageFormatting": "auto",
  "overrides": [
    {
      "files": ["*.md", "*.mdx"],
      "options": {
        "tabWidth": 4
      }
    }
  ],
  ignorePatterns: [
    ...defaultIgnorePatterns,
    "docs/**/*.md",
    // because changesets generates it on release
    "CHANGELOG.md",
  ],
});
