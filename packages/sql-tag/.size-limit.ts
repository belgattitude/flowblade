import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "1000B",
    },
    {
      name: "Only { sql } (ESM)",
      path: ["dist/index.js"],
      import: "{ sql }",
      limit: "700B",
    },
  ],
  { browserslist: true }
);

export default config;
