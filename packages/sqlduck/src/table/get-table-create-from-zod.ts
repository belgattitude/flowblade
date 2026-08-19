import {
  BIGINT,
  BOOLEAN,
  DATE,
  DOUBLE,
  DuckDBDecimalType,
  DuckDBListType,
  ENUM,
  FLOAT,
  HUGEINT,
  INTEGER,
  LIST,
  TIMESTAMP,
  TIMESTAMP_MS,
  UBIGINT,
  UUID,
  VARCHAR,
} from "@duckdb/node-api";
import type { DuckDBType } from "@duckdb/node-api";

import type { Table } from "../objects/table";
import type { TableSchemaZod } from "../validation/zod";
import { getDuckdbNumberColumnType } from "./get-duckdb-number-column-type.ts";

type ColumnDDL = {
  name: string;
  duckdbType: DuckDBType;
  constraint?: "NOT NULL" | "PRIMARY KEY";
};

export type TableCreateOptions = {
  create?: "CREATE" | "CREATE_OR_REPLACE" | "IF_NOT_EXISTS";
};

export type DuckdbColumnTypeMap<TKeys extends string> = Map<TKeys, DuckDBType>;

export type TableCreateFromZodResult<TSchema extends TableSchemaZod> = {
  ddl: string;
  columnTypes: DuckdbColumnTypeMap<
    Exclude<keyof TSchema["shape"], symbol | number>
  >;
};

export type GetTableCreateFromZodParams<TSchema extends TableSchemaZod> = {
  table: Table;
  schema: TSchema;
  options?: TableCreateOptions;
};

const createOptions = {
  CREATE: "CREATE TABLE",
  CREATE_OR_REPLACE: "CREATE OR REPLACE TABLE",
  IF_NOT_EXISTS: "CREATE TABLE IF NOT EXISTS",
} as const satisfies Record<NonNullable<TableCreateOptions["create"]>, string>;

const duckDbTypes = [
  ["VARCHAR", VARCHAR],
  ["BIGINT", BIGINT],
  ["UBIGINT", UBIGINT],
  ["HUGEINT", HUGEINT],
  ["TIMESTAMP", TIMESTAMP],
  ["TIMESTAMP_MS", TIMESTAMP_MS],
  ["UUID", UUID],
  ["BOOLEAN", BOOLEAN],
  ["INTEGER", INTEGER],
  ["DOUBLE", DOUBLE],
  ["FLOAT", FLOAT],
  ["DATE", DATE],
  // to get the proper type, we just instanciate the default
  ["DECIMAL", new DuckDBDecimalType(18, 3)],
  // Arrays
  ["VARCHAR[]", new DuckDBListType(VARCHAR)],
  ["INTEGER[]", new DuckDBListType(INTEGER)],
  ["BOOLEAN[]", new DuckDBListType(BOOLEAN)],
  ["BIGINT[]", new DuckDBListType(BIGINT)],
  ["UBIGINT[]", new DuckDBListType(UBIGINT)],
  ["UUID[]", new DuckDBListType(UUID)],
  ["DATE[]", new DuckDBListType(DATE)],
  ["TIMESTAMP[]", new DuckDBListType(TIMESTAMP)],
  ["TIMESTAMP_MS[]", new DuckDBListType(TIMESTAMP_MS)],
  ["DOUBLE[]", new DuckDBListType(DOUBLE)],
  ["FLOAT[]", new DuckDBListType(FLOAT)],
] as const satisfies [string, DuckDBType][];

export type SupportedCustomDuckDbTypes = (typeof duckDbTypes)[number][0];

const duckDbTypesMap = new Map<SupportedCustomDuckDbTypes, DuckDBType>(
  duckDbTypes
);

export const getTableCreateFromZod = <TSchema extends TableSchemaZod>(
  params: GetTableCreateFromZodParams<TSchema>
): TableCreateFromZodResult<TSchema> => {
  const { table, schema, options } = params;
  const { create = "CREATE" } = options ?? {};
  const fqTable = table.getFullName();
  const json = schema.toJSONSchema({
    target: "openapi-3.0",
    unrepresentable: "throw",
  });
  const columns: ColumnDDL[] = [];
  if (json.properties === undefined) {
    throw new TypeError("Schema must have at least one property");
  }
  const columnTypesMap = new Map<
    Exclude<keyof TSchema["shape"], symbol | number>,
    DuckDBType
  >();
  for (const [columnName, def] of Object.entries(json.properties) as [
    columnName: string,
    def: {
      type: "number" | "integer" | "string" | "boolean" | "array";
      nullable: boolean | undefined;
      format:
        | "date"
        | "date-time"
        | "int64"
        | "uuid"
        | "cuid"
        | "cuid2"
        | undefined;
      primaryKey: boolean | undefined;
      minimum?: number;
      maximum?: number;
      multipleOf?: number;
      enum?: string[];
      duckdbType?: string;
      // only when type is array
      items?: {
        type: "string" | "boolean" | "number" | "integer";
        // only for integer
        minimum?: number;
        maximum?: number;
        multipleOf?: number;
      };
    },
  ][]) {
    const {
      type,
      duckdbType,
      nullable,
      format,
      primaryKey,
      minimum,
      maximum,
      multipleOf,
    } = def;

    const c: Partial<ColumnDDL> = {
      name: columnName,
    } satisfies Partial<ColumnDDL>;

    if (
      duckdbType !== undefined &&
      !duckDbTypesMap.has(duckdbType as SupportedCustomDuckDbTypes)
    ) {
      throw new Error(
        `The provided "duckdbType: '${duckdbType}'" for '${columnName}' isn't currently supported - ${JSON.stringify(def)}`
      );
    }
    const customDuckDbType =
      duckdbType === undefined
        ? undefined
        : duckDbTypesMap.get(duckdbType as SupportedCustomDuckDbTypes);

    if (customDuckDbType === undefined) {
      switch (type) {
        case "array":
          switch (def?.items?.type) {
            case "string":
              c.duckdbType = LIST(VARCHAR);
              break;
            case "integer":
              c.duckdbType = LIST(
                getDuckdbNumberColumnType({
                  minimum: def?.items?.minimum,
                  maximum: def?.items?.maximum,
                })
              );
              break;
            case "number":
              c.duckdbType = LIST(
                getDuckdbNumberColumnType({
                  minimum: def?.items?.minimum,
                  maximum: def?.items?.maximum,
                  multipleOf: def?.items?.multipleOf,
                })
              );
              break;
            case "boolean":
              c.duckdbType = LIST(BOOLEAN);
              break;
            default:
              throw new Error(
                `The inferred duckdb array for '${columnName}' is not supported - ${JSON.stringify(def)}`
              );
          }
          break;
        case "string":
          if (Array.isArray(def.enum)) {
            c.duckdbType = ENUM(def.enum);
          } else {
            switch (format) {
              case "date":
                c.duckdbType = DATE;
                break;
              case "date-time":
                c.duckdbType = TIMESTAMP_MS;
                break;
              case "int64":
                c.duckdbType = BIGINT;
                break;
              case "uuid":
                c.duckdbType = UUID;
                break;
              default:
                c.duckdbType = VARCHAR;
            }
          }
          break;
        case "number":
          c.duckdbType = getDuckdbNumberColumnType({
            minimum,
            maximum,
            multipleOf,
          });
          break;
        // special case for z.int32()
        case "integer":
          c.duckdbType = getDuckdbNumberColumnType({ minimum, maximum });
          break;
        case "boolean":
          c.duckdbType = BOOLEAN;
          break;
        default:
          throw new Error(
            `Cannot guess '${columnName}' type - ${JSON.stringify(def)}`
          );
      }
    } else {
      c.duckdbType = customDuckDbType;
    }
    if (primaryKey === true) {
      c.constraint = "PRIMARY KEY";
    } else if (nullable !== true) {
      c.constraint = "NOT NULL";
    }
    columnTypesMap.set(
      columnName as Exclude<keyof TSchema["shape"], symbol | number>,
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
          .join(" ");
        return `  ${line}`;
      })
      .join(",\n"),
    "\n)",
  ].join("");

  return {
    ddl,
    columnTypes: columnTypesMap,
  };
};
