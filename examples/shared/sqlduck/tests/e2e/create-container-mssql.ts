import { KyselyDatasource } from '@flowblade/source-kysely';
import type { StartedMSSQLServerContainer } from '@testcontainers/mssqlserver/build/mssqlserver-container';
import {
  Kysely,
  MssqlAdapter,
  type MssqlDialectConfig,
  MssqlDriver,
  MssqlIntrospector,
  MssqlQueryCompiler,
} from 'kysely';
import * as tarn from 'tarn';
import * as tedious from 'tedious';

export const createContainerMssql = <TDatabase = unknown>(
  container: StartedMSSQLServerContainer
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
              password: container.getPassword(),
              userName: container.getUsername(),
            },
            type: 'default',
          },
          options: {
            database: container.getDatabase(),
            port: container.getFirstMappedPort(),
            trustServerCertificate: true,
            encrypt: false,
          },
          server: container.getHost(),
        }),
    },
  };
  class MssqlExtendedDriver extends MssqlDriver {
    constructor(props: MssqlDialectConfig) {
      super(props);
    }
  }
  return new KyselyDatasource({
    connection: new Kysely<TDatabase>({
      dialect: {
        createAdapter: () => new MssqlAdapter(),
        createDriver: () => {
          return new MssqlExtendedDriver(dialectConfig);
        },
        createIntrospector: (db) => new MssqlIntrospector(db),
        createQueryCompiler: () => new MssqlQueryCompiler(),
      },
    }),
  });
};
