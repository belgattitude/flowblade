import { tsdownDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/tsdown";

export default defineConfig({
  ...tsdownDefaultConfig,
  entry: [
    "./src/index.ts",
    "./src/filesystem/index.ts",
    "./src/validation/zod/index.ts",
    "./src/validation/valibot/index.ts",
    "./src/integrations/kysely/index.ts",
  ],
  platform: "node",
});
