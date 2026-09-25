import { fileURLToPath } from "node:url";

import dotenvx from "@dotenvx/dotenvx";
import { defineConfig, env } from "prisma/config";

const dotenvxConfig = dotenvx.config({
  path: fileURLToPath(new URL(".env", import.meta.url)),
  quiet: true,
});

if (dotenvxConfig.error) {
  throw dotenvxConfig.error;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx ./scripts/run-prisma-seeds.ts",
  },
  datasource: {
    url: env("DB_FLOWBLADE_SQLSERVER_JDBC"),
  },
});
