import { assertNever } from '@httpx/assert';
import { isPlainObject } from '@httpx/plain-object';

import type { IGetRawSql } from '../../core/get-raw-sql.interface.ts';
import type { DuckDatabaseManagerDbParams } from '../duck-database-manager.schemas.ts';

type Behaviour = 'OR REPLACE' | 'IF NOT EXISTS';

export type DuckDatabaseAttachCommandOptions = {
  behaviour?: Behaviour;
};

export class DuckDatabaseAttachCommand implements IGetRawSql {
  readonly options: DuckDatabaseAttachCommandOptions;
  readonly dbParams: DuckDatabaseManagerDbParams;

  constructor(
    dbParams: DuckDatabaseManagerDbParams,
    options?: DuckDatabaseAttachCommandOptions
  ) {
    this.dbParams = dbParams;
    this.options = options ?? {};
  }

  getRawSql = () => {
    const dbParams = this.dbParams;
    const parts = ['ATTACH', this.options.behaviour].filter(Boolean);
    const { type, alias } = dbParams;
    switch (type) {
      case ':memory:':
        parts.push("':memory:'");
        break;
      case 'duckdb':
        parts.push(`'${dbParams.path}'`);
        break;
      default:
        assertNever(type);
    }
    if (alias !== null) {
      parts.push('AS', `${alias}`);
    }
    const options = isPlainObject(dbParams.options)
      ? Object.entries(dbParams.options).map(([key, value]) => {
          return key === 'ACCESS_MODE' ? value : `${key} '${value}'`;
        })
      : [];
    if (options.length > 0) {
      parts.push(`(${options.join(', ')})`);
    }
    return parts.filter(Boolean).join(' ');
  };
}
