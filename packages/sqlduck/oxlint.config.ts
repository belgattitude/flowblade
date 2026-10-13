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
      // Tests using the duckdb fixtures (tests/utils/duck-test.ts) are
      // declared with a local `it` that isn't imported from vitest.
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
      // These modules receive loosely typed values (DuckDB values, paths from
      // JS callers) and must branch on their runtime type.
      files: ["src/converter/**", "src/filesystem/**"],
      rules: {
        // "anti-slop/no-runtime-typeof": "off",
      },
    },
    {
      // Union discrimination on public types (string | FQTable, PropertyKey...)
      // and a catch-boundary helper that must accept `unknown`.
      files: [
        "src/utils/quote-value.ts",
        "src/utils/rows-to-converted-columns-chunks.ts",
        "src/objects/table.ts",
        "src/validation/core/create-assert-error.ts",
        "src/manager/database/utils/get-already-attached-database-from-error.ts",
      ],
      rules: {
        // "anti-slop/no-runtime-typeof": "off",
        // "anti-slop/no-unknown-parameters": "off",
      },
    },
  ],
});
