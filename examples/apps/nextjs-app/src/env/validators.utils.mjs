// @ts-check
import { parseDuckDSNZod } from '@flowblade/sqlduck/zod';
import { convertJdbcToDsn, isParsableDsn } from '@httpx/dsn-parser';
import * as v from 'valibot';

export const vDsn = v.custom(
  (dsn) => isParsableDsn(dsn),
  'Invalid DSN format.'
);

export const vDuckDbDsn = () => {
  /** @type string|undefined */
  let lastError;
  return v.custom(
    (dsn) => {
      try {
        if (typeof dsn !== 'string') {
          throw new TypeError('DSN must be a string');
        }
        try {
          parseDuckDSNZod(dsn);
        } catch {
          return false;
        }
        return true;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'unknown error';
        return false;
      }
    },
    () => `Invalid DuckDB DSN format:  ${lastError ?? ''}`
  );
};

export const vJdbcUrlDsnCompatible = v.custom((jdbcUrl) => {
  if (typeof jdbcUrl === 'string') {
    let dsn = '';
    try {
      dsn = convertJdbcToDsn(jdbcUrl);
    } catch {
      return false;
    }
    return isParsableDsn(dsn);
  }
  return false;
}, 'Invalid JDBCUrl format.');
