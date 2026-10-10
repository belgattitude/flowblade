import { DuckDBTypeId } from "@duckdb/node-api";
import type { DuckDBType } from "@duckdb/node-api";

import { DuckValueConverter } from "./duck-value-converter.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueMapperFn<TIn = any, TOut = any> = (v: TIn) => TOut;

/**
 * Return the converter for a duck type, or false when values can be passed as is.
 */
const getDuckTypeConverter = (
  converter: DuckValueConverter,
  duckType: DuckDBType,
  key: string
): ValueMapperFn | false => {
  const duckTypeId = duckType.typeId;
  const unsupportedError = () =>
    new Error(
      `Unsupported duck type ${duckTypeId} / ${duckType.toString()} for column '${key}'`
    );
  switch (duckTypeId) {
    case DuckDBTypeId.TIMESTAMP_MS: {
      return converter.toTimestampMs;
    }
    case DuckDBTypeId.TIMESTAMP: {
      return converter.toTimestamp;
    }
    case DuckDBTypeId.INTEGER:
    case DuckDBTypeId.UINTEGER: {
      return false;
    }
    case DuckDBTypeId.BIGINT:
    case DuckDBTypeId.UBIGINT:
    case DuckDBTypeId.HUGEINT:
    case DuckDBTypeId.UHUGEINT:
    case DuckDBTypeId.BIGNUM: {
      return converter.toBigInt;
    }
    case DuckDBTypeId.ENUM: {
      return converter.toStringEnum;
    }
    case DuckDBTypeId.UUID: {
      return converter.toUUID;
    }
    // No conversion needed for these types
    case DuckDBTypeId.BIT:
    case DuckDBTypeId.BOOLEAN:
    case DuckDBTypeId.TINYINT:
    case DuckDBTypeId.USMALLINT:
    case DuckDBTypeId.UTINYINT:
    case DuckDBTypeId.VARCHAR:
    case DuckDBTypeId.SMALLINT: {
      return false;
    }
    case DuckDBTypeId.FLOAT:
    case DuckDBTypeId.DOUBLE: {
      return false;
    }
    case DuckDBTypeId.DECIMAL: {
      return converter.createDecimalConverter(duckType.width, duckType.scale);
    }
    case DuckDBTypeId.DATE: {
      return converter.toDate;
    }
    case DuckDBTypeId.LIST: {
      // Items are converted the same way a column of the list value type is
      const itemConv = getDuckTypeConverter(converter, duckType.valueType, key);
      return itemConv === false
        ? converter.toList
        : converter.createListConverter(itemConv);
    }
    // Not supported yet, listed explicitly so a new DuckDB type id is caught by
    // the switch-exhaustiveness-check lint rule
    case DuckDBTypeId.TIME:
    case DuckDBTypeId.TIME_TZ:
    case DuckDBTypeId.TIME_NS:
    case DuckDBTypeId.TIMESTAMP_S:
    case DuckDBTypeId.TIMESTAMP_NS:
    case DuckDBTypeId.TIMESTAMP_TZ:
    case DuckDBTypeId.INTERVAL:
    case DuckDBTypeId.BLOB:
    case DuckDBTypeId.STRUCT:
    case DuckDBTypeId.MAP:
    case DuckDBTypeId.ARRAY:
    case DuckDBTypeId.UNION:
    case DuckDBTypeId.ANY:
    case DuckDBTypeId.SQLNULL:
    case DuckDBTypeId.STRING_LITERAL:
    case DuckDBTypeId.INTEGER_LITERAL:
    case DuckDBTypeId.GEOMETRY:
    case DuckDBTypeId.VARIANT: {
      throw unsupportedError();
    }
    // Runtime safety for type ids unknown to the installed typings
    default: {
      throw unsupportedError();
    }
  }
};

export const createDuckColumnConverters = <
  TRow extends Record<string, unknown>,
>(
  duckTypes: Record<keyof TRow, DuckDBType>
): Partial<Record<keyof TRow, ValueMapperFn>> => {
  const convMap: Partial<Record<keyof TRow, ValueMapperFn>> = {};
  const converter = new DuckValueConverter();

  for (const [key, duckType] of Object.entries<DuckDBType>(duckTypes)) {
    const conv = getDuckTypeConverter(converter, duckType, key);
    if (conv !== false) {
      convMap[key as keyof TRow] = conv;
    }
  }
  return convMap;
};
