import { oxlintDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    "**/generated/**",
  ],
  plugins: [],
});
