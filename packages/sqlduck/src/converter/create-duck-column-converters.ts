import { type DuckDBType, DuckDBTypeId } from '@duckdb/node-api';

import { DuckValueConverter } from './duck-value-converter.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueMapperFn = (v: any) => any;

export const createDuckColumnConverters = <
  TRow extends Record<string, unknown>,
>(
  duckTypes: Record<keyof TRow, DuckDBType>
): Map<Exclude<keyof TRow, 'number'>, ValueMapperFn> => {
  const convMap = new Map<Exclude<keyof TRow, 'number'>, ValueMapperFn>();
  const converter = new DuckValueConverter();

  for (const [key, duckType] of Object.entries<DuckDBType>(duckTypes)) {
    let conv: ValueMapperFn | false;
    const duckTypeId = duckType.typeId;
    switch (duckTypeId) {
      case DuckDBTypeId.TIMESTAMP_MS:
        conv = converter.toTimestampMs;
        break;
      case DuckDBTypeId.BIGINT:
      case DuckDBTypeId.UBIGINT:
      case DuckDBTypeId.HUGEINT:
      case DuckDBTypeId.UHUGEINT:
      case DuckDBTypeId.INTEGER:
      case DuckDBTypeId.BIGNUM:
        conv = converter.toBigIntString;
        break;
      case DuckDBTypeId.ENUM:
        conv = converter.toStringEnum;
        break;
      case DuckDBTypeId.UUID:
        conv = converter.toUUID;
        break;
      // No conversion needed for these types
      case DuckDBTypeId.BIT:
      case DuckDBTypeId.BOOLEAN:
      case DuckDBTypeId.TINYINT:
      case DuckDBTypeId.VARCHAR:
      case DuckDBTypeId.SMALLINT:
        conv = false;
        break;
      default:
        throw new Error(
          `Unsupported duck type ${duckTypeId} / ${duckType.toString()} for column '${key}'`
        );
    }
    if (conv !== false) {
      convMap.set(key as Exclude<keyof TRow, 'number'>, conv);
    }
  }
  return convMap;
};
