import { oxfmtDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxfmt";

export default defineConfig({
  ...oxfmtDefaultConfig,
  ignorePatterns: ["**/generated/**"],
});
