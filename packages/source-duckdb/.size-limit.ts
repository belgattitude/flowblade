import { createSizeLimitConfig } from "@flowblade/dx";

const config = createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.mjs"],
      import: "*",
      // node builtin (AsyncLocalStorage of the connection lock)
      ignore: ["node:async_hooks"],
      limit: "13.8 kB",
    },
  ],
  { browserslist: false }
);

export default config;
