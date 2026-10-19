import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.mjs"],
      import: "*",
      limit: "9.76 kB",
    },
  ],
  { browserslist: false }
);

export default config;
