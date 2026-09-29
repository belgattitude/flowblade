import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  rules: {
    "import/no-named-default": "off",
    "typescript/no-empty-interface": "off",
    "promise/prefer-await-to-callbacks": "off",
  },
});
