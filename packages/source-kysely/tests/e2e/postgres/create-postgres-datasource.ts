import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { KyselyDatasource } from "../../../src";

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

export type PostgresE2eDb = {
  stock: {
    id: number;
    name: string;
    quantity: number;
  };
};

export const getPostgresConnectionInfo = (
  container: StartedPostgreSqlContainer
): PostgresConnectionInfo => {
  return {
    connectionString: container.getConnectionUri(),
  };
};

export const createPostgresDatasource = <TDatabase = PostgresE2eDb>(
  info: PostgresConnectionInfo
) =>
  new KyselyDatasource({
    connection: new Kysely<TDatabase>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: info.connectionString,
          max: 6,
        }),
      }),
    }),
  });
