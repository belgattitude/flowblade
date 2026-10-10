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
import type { DuckDBDecimalType } from "@duckdb/node-api";
import { describe, expect, it } from "vitest";

import { getDuckdbNumberColumnType } from "./get-duckdb-number-column-type";

describe(getDuckdbNumberColumnType, () => {
  it("should return BIGINT if minimum or maximum is undefined", () => {
    expect(
      getDuckdbNumberColumnType({ minimum: undefined, maximum: 100 })
    ).toBe(BIGINT);
    expect(getDuckdbNumberColumnType({ minimum: 0, maximum: undefined })).toBe(
      BIGINT
    );
    expect(
      getDuckdbNumberColumnType({ minimum: undefined, maximum: undefined })
    ).toBe(BIGINT);
  });

  describe("Float detection", () => {
    it("should return FLOAT for small float ranges", () => {
      expect(getDuckdbNumberColumnType({ minimum: 0.5, maximum: 10.5 })).toBe(
        FLOAT
      );
      expect(getDuckdbNumberColumnType({ minimum: -1.2, maximum: 1.2 })).toBe(
        FLOAT
      );
    });

    it("should return DECIMAL(18, scale) if multipleOf is provided and it is a float", () => {
      const cases = [
        { multipleOf: 0.1, expectedScale: 1 },
        { multipleOf: 0.01, expectedScale: 2 },
        { multipleOf: 0.001, expectedScale: 3 },
        { multipleOf: 0.0001, expectedScale: 4 },
        { multipleOf: 1.2345, expectedScale: 4 },
      ];

      for (const { multipleOf, expectedScale } of cases) {
        const colType = getDuckdbNumberColumnType({
          minimum: 0,
          maximum: 10,
          multipleOf,
        });

        const decimal = DECIMAL(18, expectedScale);
        expect(colType.typeId).toStrictEqual(decimal.typeId);
        expect((colType as DuckDBDecimalType).scale).toStrictEqual(
          decimal.scale
        );
        expect((colType as DuckDBDecimalType).width).toStrictEqual(
          decimal.width
        );
      }
    });
  });

  describe("DECIMAL from multipleOf", () => {
    const getDecimal = (
      params: Parameters<typeof getDuckdbNumberColumnType>[0]
    ) => {
      const colType = getDuckdbNumberColumnType(params) as DuckDBDecimalType;
      return {
        typeId: colType.typeId,
        width: colType.width,
        scale: colType.scale,
      };
    };
    const expectDecimal = (width: number, scale: number) => {
      const { typeId } = DECIMAL(width, scale);
      return { typeId, width, scale };
    };

    it("should support multipleOf in exponent notation", () => {
      expect(
        getDecimal({ minimum: undefined, maximum: undefined, multipleOf: 1e-7 })
      ).toStrictEqual(expectDecimal(18, 7));
      expect(
        getDecimal({
          minimum: undefined,
          maximum: undefined,
          multipleOf: 2.5e-10,
        })
      ).toStrictEqual(expectDecimal(18, 11));
    });

    it("should default to width 18 without bounds", () => {
      expect(
        getDecimal({ minimum: undefined, maximum: undefined, multipleOf: 0.01 })
      ).toStrictEqual(expectDecimal(18, 2));
    });

    it("should widen when the bounds require it", () => {
      expect(
        getDecimal({ minimum: 0, maximum: 1e20, multipleOf: 0.01 })
      ).toStrictEqual(expectDecimal(23, 2));
      expect(
        getDecimal({ minimum: -1e30, maximum: 10, multipleOf: 0.000001 })
      ).toStrictEqual(expectDecimal(37, 6));
    });

    it("should widen to 38 when the scale exceeds the default width", () => {
      expect(
        getDecimal({
          minimum: undefined,
          maximum: undefined,
          multipleOf: 1e-20,
        })
      ).toStrictEqual(expectDecimal(38, 20));
      expect(
        getDecimal({ minimum: 0, maximum: 1, multipleOf: 1e-20 })
      ).toStrictEqual(expectDecimal(21, 20));
    });

    it("should ignore bounds that cannot fit in a DECIMAL", () => {
      // ie: implicit bounds from z.float32() / z.float64()
      expect(
        getDecimal({
          minimum: -3.4028234663852886e38,
          maximum: 3.4028234663852886e38,
          multipleOf: 0.001,
        })
      ).toStrictEqual(expectDecimal(18, 3));
      expect(
        getDecimal({
          minimum: -Number.MAX_VALUE,
          maximum: Number.MAX_VALUE,
          multipleOf: 0.5,
        })
      ).toStrictEqual(expectDecimal(18, 1));
    });

    it("should throw when the scale exceeds 38", () => {
      expect(() =>
        getDuckdbNumberColumnType({
          minimum: undefined,
          maximum: undefined,
          multipleOf: 1e-39,
        })
      ).toThrow(RangeError);
    });

    it("should not return a DECIMAL for integer multipleOf", () => {
      expect(
        getDuckdbNumberColumnType({ minimum: 0, maximum: 100, multipleOf: 5 })
      ).toBe(UTINYINT);
    });
  });

  describe("Unsigned Integers", () => {
    it("should return UTINYINT for range [0, 255]", () => {
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 255 })).toBe(
        UTINYINT
      );
    });

    it("should return USMALLINT for range [0, 65535]", () => {
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 65_535 })).toBe(
        USMALLINT
      );
      expect(getDuckdbNumberColumnType({ minimum: 10, maximum: 300 })).toBe(
        USMALLINT
      );
    });

    it("should return UINTEGER for range [0, 4294967295]", () => {
      expect(
        getDuckdbNumberColumnType({ minimum: 0, maximum: 4_294_967_295 })
      ).toBe(UINTEGER);
    });

    it("should return UBIGINT for larger unsigned ranges", () => {
      // 18446744073709551615n
      expect(
        getDuckdbNumberColumnType({ minimum: 0, maximum: 10_000_000_000_000 })
      ).toBe(UBIGINT);
    });

    it("should return UHUGEINT for extremely large unsigned ranges", () => {
      // maximum > 18_446_744_073_709_551_615n
      // Note: number in JS cannot represent this exactly, but let's use a very large number or infinity
      // Actually the code uses BIGINT literals for comparison but params are 'number'
      // Wait, the code has: if (maximum <= 18_446_744_073_709_551_615n)
      // This comparison between number and bigint might be tricky or use bigint if maximum was bigint, but it is defined as number.
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 2e20 })).toBe(
        UHUGEINT
      );
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 3e38 })).toBe(
        UHUGEINT
      );
    });

    it("should fall back to a float type beyond UHUGEINT", () => {
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 3.5e38 })).toBe(
        DOUBLE
      );
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 1e300 })).toBe(
        DOUBLE
      );
    });
  });

  describe("Signed Integers", () => {
    it("should return TINYINT for range [-128, 127]", () => {
      expect(getDuckdbNumberColumnType({ minimum: -128, maximum: 127 })).toBe(
        TINYINT
      );
      expect(getDuckdbNumberColumnType({ minimum: -1, maximum: 1 })).toBe(
        TINYINT
      );
    });

    it("should return SMALLINT for range [-32768, 32767]", () => {
      expect(
        getDuckdbNumberColumnType({ minimum: -32_768, maximum: 32_767 })
      ).toBe(SMALLINT);
      expect(getDuckdbNumberColumnType({ minimum: -129, maximum: 127 })).toBe(
        SMALLINT
      );
    });

    it("should return INTEGER for range [-2147483648, 2147483647]", () => {
      expect(
        getDuckdbNumberColumnType({
          minimum: -2_147_483_648,
          maximum: 2_147_483_647,
        })
      ).toBe(INTEGER);
    });

    it("should return BIGINT for range [-9223372036854775808n, 9223372036854775807n]", () => {
      expect(
        getDuckdbNumberColumnType({
          minimum: -10_000_000_000,
          maximum: 10_000_000_000,
        })
      ).toBe(BIGINT);
    });

    it("should return HUGEINT for extremely large signed ranges", () => {
      expect(getDuckdbNumberColumnType({ minimum: -2e20, maximum: 2e20 })).toBe(
        HUGEINT
      );
      expect(getDuckdbNumberColumnType({ minimum: -1e38, maximum: 1e38 })).toBe(
        HUGEINT
      );
    });

    it("should fall back to a float type beyond HUGEINT", () => {
      // HUGEINT holds ~1.7e38, FLOAT up to ~3.4e38
      expect(getDuckdbNumberColumnType({ minimum: -2e38, maximum: 2e38 })).toBe(
        FLOAT
      );
      expect(
        getDuckdbNumberColumnType({ minimum: -1e300, maximum: 1e300 })
      ).toBe(DOUBLE);
      expect(
        getDuckdbNumberColumnType({
          minimum: Number.MIN_SAFE_INTEGER,
          maximum: Number.MAX_VALUE,
        })
      ).toBe(DOUBLE);
    });
  });
});
