import type { DBKyselySqlServer } from '@flowblade/db-sqlserver/kysely-types';
import {
  createKyselySqlServerDialect,
  TediousConnUtils,
} from '@flowblade/source-kysely';
import { Kysely } from 'kysely';

import { serverEnv } from '../../env/server.env.mjs';

const config = TediousConnUtils.fromJdbcDsn(
  serverEnv.DB_FLOWBLADE_SQLSERVER_JDBC ?? ''
);
const dialect = createKyselySqlServerDialect({
  tediousConfig: config,
  poolOptions: {
    min: 0,
    max: 10,
    validateConnections: false,
    propagateCreateError: true,
  },
  dialectConfig: {
    resetConnectionOnRelease: false,
  },
});

const maskPII = (param: unknown) => {
  // @todo filter out personal identifiable information
  return param;
};

export const dbKyselySqlServer = new Kysely<DBKyselySqlServer>({
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
