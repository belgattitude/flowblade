import { oxlintDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/oxlint";

// workspaces are linted by their own `lint` task, the root one only covers root files
const workspaceIgnorePatterns = [
  "docs/**",
  "examples/**",
  "packages/**",
  "tools/**",
];

// agent skills, symlinked to vendored sources (followed by oxlint)
const agentSkillsIgnorePatterns = [
  ".claude/skills/**",
  ".junie/skills/**",
  ".pi/skills/**",
];

export default defineConfig({
  extends: [oxlintDefaultConfig],
  ignorePatterns: [
    ...(oxlintDefaultConfig.ignorePatterns ?? []),
    ...workspaceIgnorePatterns,
    ...agentSkillsIgnorePatterns,
  ],
});
