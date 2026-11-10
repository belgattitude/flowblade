import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "16.5 kB",
    },
  ],
  { browserslist: true }
);

export default config;
