import {
  BIGINT,
  BOOLEAN,
  DOUBLE,
  type DuckDBType,
  FLOAT,
  INTEGER,
  TIMESTAMP,
  UUID,
  VARCHAR,
} from '@duckdb/node-api';

import type { Table } from '../objects/table';
import { getDuckdbNumberColumnType } from './get-duckdb-number-column-type.ts';
import type { TableSchemaZod } from './table-schema-zod.type.ts';

type ColumnDDL = {
  name: string;
  duckdbType: DuckDBType;
  constraint?: 'NOT NULL' | 'PRIMARY KEY';
};

export type TableCreateOptions = {
  create?: 'CREATE' | 'CREATE_OR_REPLACE' | 'IF_NOT_EXISTS';
};

export type DuckdbColumnTypeMap<TKeys extends string> = Map<TKeys, DuckDBType>;

export type TableCreateFromZodResult<TSchema extends TableSchemaZod> = {
  ddl: string;
  columnTypes: DuckdbColumnTypeMap<
    Exclude<keyof TSchema['shape'], symbol | number>
  >;
};

export type GetTableCreateFromZodParams<TSchema extends TableSchemaZod> = {
  table: Table;
  schema: TSchema;
  options?: TableCreateOptions;
};

const createOptions = {
  CREATE: 'CREATE TABLE',
  CREATE_OR_REPLACE: 'CREATE OR REPLACE TABLE',
  IF_NOT_EXISTS: 'CREATE TABLE IF NOT EXISTS',
} as const satisfies Record<NonNullable<TableCreateOptions['create']>, string>;

const duckDbTypes = [
  ['VARCHAR', VARCHAR],
  ['BIGINT', BIGINT],
  ['TIMESTAMP', TIMESTAMP],
  ['UUID', UUID],
  ['BOOLEAN', BOOLEAN],
  ['INTEGER', INTEGER],
  ['DOUBLE', DOUBLE],
  ['FLOAT', FLOAT],
] as const;

const duckDbTypesMap = new Map<string, DuckDBType>(duckDbTypes);

export const getTableCreateFromZod = <TSchema extends TableSchemaZod>(
  params: GetTableCreateFromZodParams<TSchema>
): TableCreateFromZodResult<TSchema> => {
  const { table, schema, options } = params;
  const { create = 'CREATE' } = options ?? {};
  const fqTable = table.getFullName();
  const json = schema.toJSONSchema({
    target: 'openapi-3.0',
    unrepresentable: 'throw',
  });
  const columns: ColumnDDL[] = [];
  if (json.properties === undefined) {
    throw new TypeError('Schema must have at least one property');
  }
  const columnTypesMap = new Map<
    Exclude<keyof TSchema['shape'], symbol | number>,
    DuckDBType
  >();
  for (const [columnName, def] of Object.entries(json.properties) as [
    columnName: string,
    def: {
      type: 'number' | 'integer' | 'string' | 'boolean';
      nullable: boolean | undefined;
      format: 'date-time' | 'int64' | 'uuid' | 'cuid' | 'cuid2' | undefined;
      primaryKey: boolean | undefined;
      minimum?: number;
      maximum?: number;
      duckdbType?: string;
    },
  ][]) {
    const { type, duckdbType, nullable, format, primaryKey, minimum, maximum } =
      def;

    const c: Partial<ColumnDDL> = {
      name: columnName,
    } satisfies Partial<ColumnDDL>;

    if (duckdbType !== undefined && duckDbTypesMap.has(duckdbType)) {
      c.duckdbType = duckDbTypesMap.get(duckdbType)!;
    } else {
      switch (type) {
        case 'string':
          switch (format) {
            case 'date-time':
              c.duckdbType = TIMESTAMP;
              break;
            case 'int64':
              c.duckdbType = BIGINT;
              break;
            case 'uuid':
              c.duckdbType = UUID;
              break;
            default:
              c.duckdbType = VARCHAR;
          }
          break;
        case 'number':
          c.duckdbType = getDuckdbNumberColumnType({ minimum, maximum });
          break;
        // special case for z.int32()
        case 'integer':
          c.duckdbType = getDuckdbNumberColumnType({ minimum, maximum });
          break;
        case 'boolean':
          c.duckdbType = BOOLEAN;
          break;
        default:
          throw new Error(
            `Cannot guess '${columnName}' type - ${JSON.stringify(def)}`
          );
      }
    }
    if (primaryKey === true) {
      c.constraint = 'PRIMARY KEY';
    } else if (nullable !== true) {
      c.constraint = 'NOT NULL';
    }
    columnTypesMap.set(
      columnName as Exclude<keyof TSchema['shape'], symbol | number>,
      c.duckdbType
    );
    columns.push(c as ColumnDDL);
  }

  const createDDL = createOptions[create];

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
    columnTypes: columnTypesMap,
  };
};
