import { assertNever } from '@httpx/assert';
import { Kysely } from 'kysely';

import {
  createKyselyMssqlDialect,
  KyselyDatasource,
  TediousConnUtils,
} from '../../src';
import { envE2EConfig } from '../env.e2e.config';
import type { E2EDbTypes } from './e2e-db.types';

const tediousConfig = TediousConnUtils.fromJdbcDsn(envE2EConfig.sqlServer.dsn);

export const e2eSqlServerDb = new Kysely<E2EDbTypes['sqlServer']>({
  dialect: createKyselyMssqlDialect({
    tediousConfig,
    poolOptions: {
      min: 0,
      max: 10,
      propagateCreateError: true,
    },
    dialectConfig: {
      validateConnections: false,
      resetConnectionsOnRelease: false,
    },
  }),
});

type DBType = 'sql-server';

export const createE2eDatasource = (type: DBType) => {
  switch (type) {
    case 'sql-server':
      return new KyselyDatasource({
        connection: e2eSqlServerDb,
      });
    default:
      assertNever(type);
  }
};
