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
      // `format` accepts `SqlTag | string`, discriminated at runtime
      files: ["src/sql-formatter.ts"],
      rules: {
        // "anti-slop/no-runtime-typeof": "off",
      },
    },
  ],
});
