import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "62KB",
    },
    {
      name: "Only { SqlFormatter } (ESM)",
      path: ["dist/index.js"],
      import: "{ SqlFormatter }",
      limit: "62Kb",
    },
  ],
  { browserslist: true }
);

export default config;
