import { tsdownBrowserConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/tsdown";

import pkg from "./package.json" with { type: "json" };

const [major] = pkg.version.split(".");

export default defineConfig({
  ...tsdownBrowserConfig,
  entry: {
    index: "./src/index.ts",
    datasource: "./src/datasource/index.ts",
  },
  // brand symbol shared by all copies of the same major version (src/utils/brand.ts)
  define: { __FLOWBLADE_CORE_MAJOR__: JSON.stringify(major) },
});
