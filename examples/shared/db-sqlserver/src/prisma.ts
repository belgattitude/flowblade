import { fileURLToPath } from "node:url";

import dotenvx from "@dotenvx/dotenvx";
import { PrismaMssql } from "@prisma/adapter-mssql";

import { PrismaClient } from "./generated/client/client";

export type { Prisma as PrismaSqlServer } from "./generated/client/client";

const dotenvxConfig = dotenvx.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

if (dotenvxConfig.error) {
  throw dotenvxConfig.error;
}

export class PrismaClientSqlServer extends PrismaClient {
  constructor() {
    const databaseUrl = process.env.DB_FLOWBLADE_SQLSERVER_JDBC;
    if (!databaseUrl) {
      throw new Error("DB_FLOWBLADE_SQLSERVER_JDBC must be configured");
    }
    super({ adapter: new PrismaMssql(databaseUrl) });
  }
}
