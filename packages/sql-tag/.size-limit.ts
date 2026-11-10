import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "760 B",
    },
    {
      name: "Only { sql } (ESM)",
      path: ["dist/index.js"],
      import: "{ sql }",
      limit: "650 B",
    },
  ],
  { browserslist: true }
);

export default config;
