import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import knex from "knex";

import { KnexDatasource } from "../../../src/index.ts";

/**
 * Serializable connection info, shared from the global setup to the
 * test files through vitest provide / inject.
 */
export type PostgresConnectionInfo = {
  connectionString: string;
};

declare module "vitest" {
  interface ProvidedContext {
    postgres: PostgresConnectionInfo;
  }
}

export const getPostgresConnectionInfo = (
  container: StartedPostgreSqlContainer
): PostgresConnectionInfo => {
  return { connectionString: container.getConnectionUri() };
};

export const createPostgresDatasource = (
  info: PostgresConnectionInfo,
  options?: { poolMax?: number }
) =>
  new KnexDatasource({
    connection: knex({
      client: "pg",
      connection: info.connectionString,
      pool: { min: 0, max: options?.poolMax ?? 6 },
    }),
  });
