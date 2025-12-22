import {
  BIGINT,
  type DuckDBType,
  INTEGER,
  TIMESTAMP,
  VARCHAR,
} from '@duckdb/node-api';
import type { ZodObject } from 'zod';

import type { Table } from './table';

type ColumnDDL = {
  name: string;
  duckdbType: DuckDBType;
  constraint?: 'NOT NULL' | 'PRIMARY KEY';
};

export type TableCreateOptions = {
  create?: 'CREATE' | 'CREATE_OR_REPLACE' | 'IF_NOT_EXISTS';
};

const createMap = {
  CREATE: 'CREATE TABLE',
  CREATE_OR_REPLACE: 'CREATE OR REPLACE TABLE',
  IF_NOT_EXISTS: 'CREATE TABLE IF NOT EXISTS',
} as const satisfies Record<NonNullable<TableCreateOptions['create']>, string>;

export const getTableCreateFromZod = <T extends ZodObject>(
  table: Table,
  schema: T,
  options?: TableCreateOptions
): {
  ddl: string;
  columnTypes: [name: string, type: DuckDBType][];
} => {
  const { create = 'CREATE' } = options ?? {};
  const fqTable = table.getFullyQualifiedTableName();
  const json = schema.toJSONSchema({
    target: 'openapi-3.0',
  });
  const columns: ColumnDDL[] = [];
  if (json.properties === undefined) {
    throw new TypeError('Schema must have at least one property');
  }
  const columnTypes: [name: string, type: DuckDBType][] = [];
  for (const [columnName, def] of Object.entries(json.properties)) {
    const { type, nullable, format, primaryKey } = def as {
      type: 'number' | 'string';
      nullable: boolean | undefined;
      format: 'date-time' | 'int64' | undefined;
      primaryKey: boolean | undefined;
    };

    const c: Partial<ColumnDDL> = {
      name: columnName,
    } satisfies Partial<ColumnDDL>;

    switch (type) {
      case 'string':
        switch (format) {
          case 'date-time':
            c.duckdbType = TIMESTAMP;
            break;
          case 'int64':
            c.duckdbType = BIGINT;
            break;
          default:
            c.duckdbType = VARCHAR;
        }
        break;
      case 'number':
        c.duckdbType = INTEGER;
        break;
      default:
        throw new Error('Not a supported type');
    }
    if (primaryKey === true) {
      c.constraint = 'PRIMARY KEY';
    } else if (nullable !== true) {
      c.constraint = 'NOT NULL';
    }
    columnTypes.push([columnName, c.duckdbType]);
    columns.push(c as ColumnDDL);
  }

  const createDDL = createMap[create];

  const ddl = [
    `${createDDL} ${fqTable} (\n`,
    columns
      .map((colDDL) => {
        const { name, duckdbType, constraint } = colDDL;
        const line = [name, duckdbType.toString(), constraint]
          .filter(Boolean)
          .join(' ');
        return `  ${line}`;
      })
      .join(',\n'),
    '\n)',
  ].join('');

  return {
    ddl,
    columnTypes,
  };
};
