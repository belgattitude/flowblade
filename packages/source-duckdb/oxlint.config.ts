import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  plugins: [],
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "typescript/require-await": "off",
      },
    },
    {
      // Tests use the `it` from tests/utils/duck-test.ts (ds fixture), which
      // isn't imported from vitest
      files: ["*.test.ts"],
      plugins: ["vitest"],
      rules: {
        "vitest/no-standalone-expect": [
          "error",
          { additionalTestBlockFunctions: ["it", "it.for", "it.each"] },
        ],
      },
    },
    {
      // catch blocks receive `unknown`, libraries (ie: tedious) may even throw
      // strings or arrays, so the thrown value is discriminated at runtime
      files: ["src/datasource/duckdb-datasource.ts"],
      rules: {
        // "anti-slop/no-runtime-typeof": "off",
      },
    },
  ],
});
