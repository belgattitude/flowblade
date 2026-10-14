import { tsdownDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/tsdown";

export default defineConfig({
  ...tsdownDefaultConfig,
  platform: "node",
});
