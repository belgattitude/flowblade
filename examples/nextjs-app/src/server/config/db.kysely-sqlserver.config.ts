import type { DBKyselySqlServer } from '@flowblade/db-sqlserver/kysely-types';
import { ConnectionUtils, createDialect } from '@flowblade/source-kysely';
import { Kysely, MssqlDriver } from 'kysely';

import { serverEnv } from '../../env/server.env.mjs';

const config = ConnectionUtils.jdbcToTediousConfig(
  serverEnv.DB_FLOWBLADE_SQLSERVER_JDBC ?? ''
);
const dialect = createDialect(config);

const maskPII = (param: unknown) => {
  // @todo filter out personal identifiable information
  return param;
};

export class TediousAdapter extends MssqlDriver {
  getDialect() {
    return dialect;
  }
}

export const dbKyselySqlServer = new Kysely<DBKyselySqlServer>({
  dialect: dialect,

  // @todo decide if we want to move it to query executor instead.
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
