import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.mjs"],
      import: "*",
      limit: "60Kb",
    },
    {
      name: "Only { DuckDatabaseManager } (ESM)",
      path: ["dist/index.mjs"],
      import: "{ DuckDatabaseManager }",
      limit: "50Kb",
    },
  ],
  { browserslist: false }
);

export default config;
