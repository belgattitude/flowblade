import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "730 B",
    },
    {
      name: "Only { sql } (ESM)",
      path: ["dist/index.js"],
      import: "{ sql }",
      limit: "640 B",
    },
  ],
  { browserslist: true }
);

export default config;
