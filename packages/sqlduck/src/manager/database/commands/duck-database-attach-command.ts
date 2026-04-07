import { assertNever } from '@httpx/assert';
import { isPlainObject } from '@httpx/plain-object';

import type {
  DuckAllConnectionOptions,
  DuckConnectionParams,
} from '../../../validation/core/types.ts';
import type { IGetRawSql } from '../../core/get-raw-sql.interface.ts';

type Behaviour = 'OR REPLACE' | 'IF NOT EXISTS';

export type DuckDatabaseAttachCommandOptions = {
  behaviour?: Behaviour;
};

export class DuckDatabaseAttachCommand implements IGetRawSql {
  readonly options: DuckDatabaseAttachCommandOptions;
  readonly dbParams: DuckConnectionParams;

  constructor(
    dbParams: DuckConnectionParams,
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
      case 'memory':
        parts.push("':memory:'");
        break;
      case 'filesystem':
        parts.push(`'${dbParams.path}'`);
        break;
      default:
        assertNever(type);
    }
    if (alias !== null) {
      parts.push('AS', `${alias}`);
    }

    const options: string[] = [];

    type Entries<T> = {
      [K in keyof T]: [key: K, value: T[K]];
    }[keyof T][];

    if (isPlainObject<DuckAllConnectionOptions>(dbParams.options)) {
      for (const [key, value] of Object.entries(dbParams.options)) {
        switch (key as keyof DuckAllConnectionOptions) {
          case 'accessMode':
            options.push(`${value}`);
            break;
          case 'compress':
            if (value === true) {
              options.push('COMPRESS');
            }
            break;
          case 'blockSize':
            options.push(`BLOCK_SIZE ${value}`);
            break;
          case 'rowGroupSize':
            options.push(`ROW_GROUP_SIZE ${value}`);
            break;
          case 'type':
            options.push(`TYPE ${value}`);
            break;
          case 'storageVersion':
            options.push(`STORAGE_VERSION '${value}'`);
            break;
          case 'encryptionCipher':
            options.push(`ENCRYPTION_CIPHER '${value}'`);
            break;
          case 'encryptionKey':
            options.push(`ENCRYPTION_KEY '${value}'`);
            break;
          default:
          // ignore
        }
      }
    }

    if (options.length > 0) {
      parts.push(`(${options.join(', ')})`);
    }
    return parts.filter(Boolean).join(' ');
  };
}
