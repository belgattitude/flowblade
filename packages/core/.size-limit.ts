import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "4.3 kB",
    },
    {
      name: "Import { QResult } (ESM)",
      path: ["dist/index.js"],
      import: "{ QResult }",
      limit: "3.5 kB",
    },
  ],
  { browserslist: true }
);

export default config;
