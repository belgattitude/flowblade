import { oxlintDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxlint";

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
