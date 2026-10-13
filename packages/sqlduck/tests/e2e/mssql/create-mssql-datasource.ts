import { KyselyDatasource } from "@flowblade/source-kysely";
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import {
  Kysely,
  MssqlAdapter,
  MssqlDriver,
  MssqlIntrospector,
  MssqlQueryCompiler,
} from "kysely";
import type { MssqlDialectConfig } from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";

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

export const createMssqlDatasource = <TDatabase = unknown>(
  info: MssqlConnectionInfo
) => {
  const dialectConfig: MssqlDialectConfig = {
    tarn: {
      ...tarn,
      options: {
        min: 0,
        max: 4,
      },
    },
    tedious: {
      ...tedious,
      connectionFactory: () =>
        new tedious.Connection({
          authentication: {
            options: {
              password: info.password,
              userName: info.username,
            },
            type: "default",
          },
          options: {
            database: info.database,
            port: info.port,
            trustServerCertificate: true,
            encrypt: false,
          },
          server: info.host,
        }),
    },
  };
  class MssqlExtendedDriver extends MssqlDriver {}
  return new KyselyDatasource({
    connection: new Kysely<TDatabase>({
      dialect: {
        createAdapter: () => new MssqlAdapter(),
        createDriver: () => new MssqlExtendedDriver(dialectConfig),
        createIntrospector: (db) => new MssqlIntrospector(db),
        createQueryCompiler: () => new MssqlQueryCompiler(),
      },
    }),
  });
};
