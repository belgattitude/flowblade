import { Kysely } from 'kysely';

import {
  createKyselyMssqlDialect,
  KyselyDatasource,
  TediousConnUtils,
} from '../src';

const jdbcDsn =
  'sqlserver://localhost:1433;database=master;user=sa;password=flowblade-e2e;trustServerCertificate=true;encrypt=false';
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

const dialect = createKyselyMssqlDialect(tediousConfig, {
  // Optional tarn pool options
  tarnPool: {
    min: 0,
    max: 10,
  },
});

export const e2eDb = new Kysely<unknown>({
  dialect,
});

export const e2eExecutor = new KyselyDatasource({
  connection: e2eDb,
});
