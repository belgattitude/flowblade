import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  rules: {
    "import/no-named-default": "off",
    "typescript/no-empty-interface": "off",
    "promise/prefer-await-to-callbacks": "off",
  },
  overrides: [
    {
      // framework entrypoints (fastify plugins/routes, next route handlers, pages, config)
      // are expected to be async even without await
      files: ["**/*.{ts,tsx,mjs}"],
      rules: {
        "typescript/require-await": "off",
      },
    },
    {
      files: ["swagger.ts"],
      rules: {
        "typescript/no-unsafe-argument": "off",
      },
    },
  ],
});
