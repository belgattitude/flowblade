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
      name: "Only { SqlDuck } (ESM)",
      path: ["dist/index.mjs"],
      import: "{ SqlDuck }",
      limit: "50Kb",
    },
  ],
  { browserslist: false }
);

export default config;
