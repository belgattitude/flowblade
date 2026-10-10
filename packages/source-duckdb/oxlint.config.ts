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
      // catch blocks receive `unknown`, libraries (ie: tedious) may even throw
      // strings or arrays, so the thrown value is discriminated at runtime
      files: ["src/datasource/duckdb-datasource.ts"],
      rules: {
        // "anti-slop/no-runtime-typeof": "off",
      },
    },
  ],
});
