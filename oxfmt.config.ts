import { oxfmtDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxfmt";

// workspaces are formatted by their own `lint` / `format` tasks, the root ones only cover root files
const workspaceIgnorePatterns = [
  "docs/**",
  "examples/**",
  "packages/**",
  "tools/**",
];

export default defineConfig({
  ...oxfmtDefaultConfig,
  ignorePatterns: [
    ...(oxfmtDefaultConfig.ignorePatterns ?? []),
    ...workspaceIgnorePatterns,
  ],
});
