import type {
  DuckAllConnectionOptions,
  DuckConnectionParams,
} from '../../../validation/core/types.ts';
import {
  DuckDatabaseAttachCommand,
  type DuckDatabaseAttachCommandOptions,
} from './duck-database-attach-command.ts';

describe('DuckDataBaseManagerAttachCommand', () => {
  describe('01 - memory', () => {
    const valid = [
      [{ compress: true }, undefined, "ATTACH ':memory:' AS my_db (COMPRESS)"],
      [{ compress: false }, undefined, "ATTACH ':memory:' AS my_db"],
      [{}, undefined, "ATTACH ':memory:' AS my_db"],

      // OR REPLACE
      [
        { compress: true },
        'OR REPLACE',
        "ATTACH OR REPLACE ':memory:' AS my_db (COMPRESS)",
      ],

      // OR IF NOT EXISTS
      [
        { compress: false },
        'IF NOT EXISTS',
        "ATTACH IF NOT EXISTS ':memory:' AS my_db",
      ],
    ] as const satisfies [
      options: DuckAllConnectionOptions,
      behaviour: DuckDatabaseAttachCommandOptions['behaviour'],
      sql: string,
    ][];
    it.each(valid)(
      'should produce expected sql %s with behaviour %s',
      (options, behaviour, expectedSql) => {
        const params: DuckConnectionParams = {
          type: 'memory',
          alias: 'my_db',
          options: options,
        };
        const cmd = new DuckDatabaseAttachCommand(params, {
          behaviour,
        });
        expect(cmd.getRawSql()).toStrictEqual(expectedSql);
      }
    );
  });

  describe('02 - duckdb file', () => {
    const valid = [
      [
        { blockSize: 4096, rowGroupSize: 8192, storageVersion: 'v1.5.0' },
        undefined,
        "ATTACH '/tmp/duckdb.db' AS my_db (BLOCK_SIZE 4096, ROW_GROUP_SIZE 8192, STORAGE_VERSION 'v1.5.0')",
      ],
    ] as const satisfies [
      options: DuckAllConnectionOptions,
      behaviour: DuckDatabaseAttachCommandOptions['behaviour'],
      sql: string,
    ][];
    it.each(valid)(
      'should produce expected sql %s with behaviour %s',
      (options, behaviour, expectedSql) => {
        const params: DuckConnectionParams = {
          type: 'filesystem',
          alias: 'my_db',
          path: '/tmp/duckdb.db',
          options: options,
        };
        const cmd = new DuckDatabaseAttachCommand(params, {
          behaviour,
        });
        expect(cmd.getRawSql()).toStrictEqual(expectedSql);
      }
    );
  });
});
