import {
  BIGINT,
  DECIMAL,
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
} from "@duckdb/node-api";

const isFloatValue = (value: number): boolean => {
  if (!Number.isFinite(value)) {
    return true;
  }
  if (!value.toString(10).includes(".")) {
    return false;
  }
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return true;
  }
  return !Number.isInteger(value);
};

/**
 * Number of decimal digits of a value, handles exponent notation (ie: 1e-7)
 */
const getScale = (value: number): number => {
  const [mantissa = "", exponent = "0"] = value.toString().split("e");
  const mantissaScale = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, mantissaScale - Number(exponent));
};

const DECIMAL_DEFAULT_WIDTH = 18;
const DECIMAL_MAX_WIDTH = 38;

/**
 * Infer the DECIMAL width from the scale and the optional bounds. Starts at
 * the default width (18) and widens up to 38 when the bounds or the scale
 * require it. Bounds too large to fit (ie: implicit z.float32() / z.float64()
 * ones) are ignored, out of range values will be rejected at conversion.
 */
const getDecimalWidth = (params: {
  scale: number;
  minimum: number | undefined;
  maximum: number | undefined;
}): number => {
  const { scale, minimum, maximum } = params;
  if (scale > DECIMAL_MAX_WIDTH) {
    throw new RangeError(
      `Cannot infer a DECIMAL type, scale ${scale} exceeds the maximum width of ${DECIMAL_MAX_WIDTH}`
    );
  }
  const minWidth =
    scale > DECIMAL_DEFAULT_WIDTH ? DECIMAL_MAX_WIDTH : DECIMAL_DEFAULT_WIDTH;
  if (minimum === undefined || maximum === undefined) {
    return minWidth;
  }
  const maxAbs = Math.max(Math.abs(minimum), Math.abs(maximum));
  if (!Number.isFinite(maxAbs)) {
    return minWidth;
  }
  const integerDigits = maxAbs < 1 ? 1 : Math.floor(Math.log10(maxAbs)) + 1;
  const requiredWidth = integerDigits + scale;
  if (requiredWidth > DECIMAL_MAX_WIDTH) {
    return minWidth;
  }
  return Math.max(DECIMAL_DEFAULT_WIDTH, requiredWidth);
};

const getFloatType = (minimum: number, maximum: number) => {
  // FLOAT (32-bit): ~3.4e38 range, ~7 decimal digits precision
  if (minimum >= -3.4028235e38 && maximum <= 3.4028235e38) {
    return FLOAT;
  }
  // DOUBLE (64-bit): ~1.8e308 range
  return DOUBLE;
};

export const getDuckdbNumberColumnType = (params: {
  minimum: number | undefined;
  maximum: number | undefined;
  multipleOf?: number | undefined;
}) => {
  const { minimum, maximum, multipleOf } = params;

  if (
    multipleOf !== undefined &&
    Number.isFinite(multipleOf) &&
    !Number.isInteger(multipleOf)
  ) {
    const scale = getScale(multipleOf);
    return DECIMAL(getDecimalWidth({ scale, minimum, maximum }), scale);
  }

  if (minimum === undefined || maximum === undefined) {
    return BIGINT;
  }

  // Detect float from fractional values
  const isFloat = isFloatValue(minimum) || isFloatValue(maximum);

  if (isFloat) {
    return getFloatType(minimum, maximum);
  }

  // Unsigned types (when minimum >= 0)
  if (minimum >= 0) {
    if (maximum <= 255) {
      return UTINYINT;
    }
    if (maximum <= 65_535) {
      return USMALLINT;
    }
    if (maximum <= 4_294_967_295) {
      return UINTEGER;
    }
    if (maximum <= 18_446_744_073_709_551_615n) {
      return UBIGINT;
    }
    if (maximum <= 2n ** 128n - 1n) {
      return UHUGEINT;
    }
    // Too large for any integer type (ie: 1e300)
    return getFloatType(minimum, maximum);
  }

  // Signed types
  if (minimum >= -128 && maximum <= 127) {
    return TINYINT;
  }
  if (minimum >= -32_768 && maximum <= 32_767) {
    return SMALLINT;
  }
  if (minimum >= -2_147_483_648 && maximum <= 2_147_483_647) {
    return INTEGER;
  }
  if (
    minimum >= -9_223_372_036_854_775_808n &&
    maximum <= 9_223_372_036_854_775_807n
  ) {
    return BIGINT;
  }
  if (minimum >= -(2n ** 127n) && maximum <= 2n ** 127n - 1n) {
    return HUGEINT;
  }
  // Too large for any integer type (ie: 1e300)
  return getFloatType(minimum, maximum);
};
