import {
  BIGINT,
  DOUBLE,
  FLOAT,
  HUGEINT,
  INTEGER,
  SMALLINT,
  TINYINT,
  UBIGINT,
  UHUGEINT,
  UINTEGER,
  USMALLINT,
  UTINYINT,
} from '@duckdb/node-api';

const isFloatValue = (value: number): boolean => {
  if (!Number.isFinite(value)) return true;
  // Numbers beyond safe integer range lose precision, treat as float
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) return true;
  return !Number.isInteger(value);
};

export const getDuckdbNumberColumnType = (params: {
  minimum: number | undefined;
  maximum: number | undefined;
}) => {
  const { minimum, maximum } = params;
  if (minimum === undefined || maximum === undefined) {
    return BIGINT;
  }
  // Detect float from fractional values
  const isFloat = isFloatValue(minimum) || isFloatValue(maximum);

  if (isFloat) {
    // FLOAT (32-bit): ~3.4e38 range, ~7 decimal digits precision
    if (minimum >= -3.402_823_5e38 && maximum <= 3.402_823_5e38) {
      return FLOAT;
    }
    // DOUBLE (64-bit): ~1.8e308 range
    return DOUBLE;
  }

  // Unsigned types (when minimum >= 0)
  if (minimum >= 0) {
    if (maximum <= 255) return UTINYINT;
    if (maximum <= 65_535) return USMALLINT;
    if (maximum <= 4_294_967_295) return UINTEGER;
    if (maximum <= 18_446_744_073_709_551_615n) return UBIGINT;
    return UHUGEINT;
  }

  // Signed types
  if (minimum >= -128 && maximum <= 127) return TINYINT;
  if (minimum >= -32_768 && maximum <= 32_767) return SMALLINT;
  if (minimum >= -2_147_483_648 && maximum <= 2_147_483_647) return INTEGER;
  if (
    minimum >= -9_223_372_036_854_775_808n &&
    maximum <= 9_223_372_036_854_775_807n
  ) {
    return BIGINT;
  }
  return HUGEINT;
};
