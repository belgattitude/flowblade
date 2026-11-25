import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import knex from "knex";

import { KnexDatasource } from "../../../src/index.ts";

/**
 * Serializable connection info, shared from the global setup to the
 * test files through vitest provide / inject.
 */
export type MssqlConnectionInfo = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

declare module "vitest" {
  interface ProvidedContext {
    mssql: MssqlConnectionInfo;
  }
}

export const getMssqlConnectionInfo = (
  container: StartedMSSQLServerContainer
): MssqlConnectionInfo => {
  return {
    host: container.getHost(),
    port: container.getFirstMappedPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
  };
};

export const createMssqlDatasource = (
  info: MssqlConnectionInfo,
  options?: { poolMax?: number }
) =>
  new KnexDatasource({
    connection: knex({
      client: "mssql",
      connection: {
        server: info.host,
        port: info.port,
        database: info.database,
        user: info.username,
        password: info.password,
        options: { encrypt: false, trustServerCertificate: true },
      },
      pool: { min: 0, max: options?.poolMax ?? 6 },
    }),
  });
