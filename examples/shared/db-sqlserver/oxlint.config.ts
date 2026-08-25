import { oxlintDefaultConfig } from "@flowblade/devtools";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    "**/generated/**",
  ],
  plugins: [],
});
