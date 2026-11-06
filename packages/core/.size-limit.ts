import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "4.6 kB",
    },
    {
      name: "Import { QResult } (ESM)",
      path: ["dist/index.js"],
      import: "{ QResult }",
      limit: "4.2 kB",
    },
    {
      name: "Import * from '@flowblade/core/datasource' (ESM)",
      path: ["dist/datasource.js"],
      import: "*",
      limit: "6.5 kB",
    },
  ],
  { browserslist: true }
);

export default config;
