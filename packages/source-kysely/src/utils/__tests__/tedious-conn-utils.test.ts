import { TediousConnUtils } from '../tedious-conn-utils';

describe('TediousConnUtils', () => {
  describe('fromJdbcDsn', () => {
    it('should parse a valid dsn', () => {
      const jdbcDsn =
        'sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false';
      const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
      expect(tediousConfig).toStrictEqual({
        authentication: {
          options: {
            password: 'pwd',
            userName: 'sa',
          },
          type: 'default',
        },
        options: {
          database: 'db',
          encrypt: false,
          port: 1433,
          trustServerCertificate: true,
          useUTC: true,
        },
        server: 'localhost',
      });
    });
  });
});
