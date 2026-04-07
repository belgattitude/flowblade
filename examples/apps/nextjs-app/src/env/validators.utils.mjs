// @ts-check

import { convertJdbcToDsn, isParsableDsn } from '@httpx/dsn-parser';
import * as v from 'valibot';

export const vDsn = v.custom(
  (dsn) => isParsableDsn(dsn),
  'Invalid DSN format.'
);

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
