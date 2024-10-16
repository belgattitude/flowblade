import { MssqlDialect } from 'kysely';
import * as Tedious from 'tedious';

import { createKyselyMssqlDialect } from '../create-kysely-mssql-dialect';
import { TediousConnUtils } from '../tedious-conn-utils';

describe('createKyselyMssqlDialect', () => {
  it('should allow to redefine tedious types', () => {
    const jdbcDsn =
      'sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false';
    const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
    const dialect = createKyselyMssqlDialect(tediousConfig, {
      tarnPool: {
        min: 0,
        max: 10,
      },
      tediousTypes: {
        ...Tedious.TYPES,
        NVarChar: Tedious.TYPES.VarChar,
      },
    });
    expect(dialect).toBeInstanceOf(MssqlDialect);
  });
});
