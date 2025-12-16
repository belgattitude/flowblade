import type { DBKyselySqlServer } from '@examples/db-sqlserver/kysely-types';
import {
  createKyselyMssqlDialect,
  TediousConnUtils,
} from '@flowblade/source-kysely';
import { Kysely } from 'kysely';
import * as Tedious from 'tedious';

import { serverEnv } from '../../env/server.env.mjs';

const config = TediousConnUtils.fromJdbcDsn(
  serverEnv.DB_FLOWBLADE_MSSQL_JDBC ?? ''
);
const dialect = createKyselyMssqlDialect({
  tediousConfig: config,
  poolOptions: {
    min: 0,
    max: 10,
    propagateCreateError: true,
  },
  dialectConfig: {
    validateConnections: false,
    resetConnectionsOnRelease: false,
    tediousTypes: {
      ...Tedious.TYPES,
      // see https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      NVarChar: Tedious.TYPES.VarChar,
      // see https://github.com/kysely-org/kysely/issues/1596#issuecomment-3341591075
      DateTime: Tedious.TYPES.DateTime2,
    },
  },
});

const maskPII = (param: unknown) => {
  // @todo filter out personal identifiable information
  return param;
};

const createDbKysely = () => {
  return new Kysely<DBKyselySqlServer>({
    dialect: dialect,
    log: (event) => {
      if (event.level === 'error') {
        console.error('Query failed :', {
          durationMs: event.queryDurationMillis,
          error: event.error,
          sql: event.query.sql,
          params: event.query.parameters.map((param) => maskPII(param)),
        });
      } else {
        console.log('Query executed :', {
          durationMs: event.queryDurationMillis,
          sql: event.query.sql,
          params: event.query.parameters.map((param) => maskPII(param)),
        });
      }
    },
  });
};

// @see instrumentation.ts
export const initializeDbKyselyMssqlConn = (): Kysely<DBKyselySqlServer> => {
  return createDbKysely();
};

export const dbKyselyMssql =
  process.env.NODE_ENV === 'production'
    ? createDbKysely()
    : (
        globalThis as unknown as {
          dbKyselyMssqlConn: Kysely<DBKyselySqlServer>;
        }
      ).dbKyselyMssqlConn;
