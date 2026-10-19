import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "62.13 kB",
    },
    {
      name: "Only { SqlFormatter } (ESM)",
      path: ["dist/index.js"],
      import: "{ SqlFormatter }",
      limit: "62.16 kB",
    },
  ],
  { browserslist: true }
);

export default config;
