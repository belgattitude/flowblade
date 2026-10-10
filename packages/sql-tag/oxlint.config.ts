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
  ],
});
