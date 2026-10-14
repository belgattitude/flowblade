import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "4kb",
    },
    {
      name: "Import { QResult } (ESM)",
      path: ["dist/index.js"],
      import: "{ QResult }",
      limit: "4kb",
    },
  ],
  { browserslist: true }
);

export default config;
