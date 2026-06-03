import {
  BIGINT,
  DECIMAL,
  type DuckDBDecimalType,
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
import { describe, expect, it } from 'vitest';

import { getDuckdbNumberColumnType } from './get-duckdb-number-column-type';

describe('getDuckdbNumberColumnType', () => {
  it('should return BIGINT if minimum or maximum is undefined', () => {
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

  describe('Float detection', () => {
    it('should return FLOAT for small float ranges', () => {
      expect(getDuckdbNumberColumnType({ minimum: 0.5, maximum: 10.5 })).toBe(
        FLOAT
      );
      expect(getDuckdbNumberColumnType({ minimum: -1.2, maximum: 1.2 })).toBe(
        FLOAT
      );
    });

    it('should return DECIMAL(18, scale) if multipleOf is provided and it is a float', () => {
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

  describe('Unsigned Integers', () => {
    it('should return UTINYINT for range [0, 255]', () => {
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 255 })).toBe(
        UTINYINT
      );
    });

    it('should return USMALLINT for range [0, 65535]', () => {
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 65_535 })).toBe(
        USMALLINT
      );
      expect(getDuckdbNumberColumnType({ minimum: 10, maximum: 300 })).toBe(
        USMALLINT
      );
    });

    it('should return UINTEGER for range [0, 4294967295]', () => {
      expect(
        getDuckdbNumberColumnType({ minimum: 0, maximum: 4_294_967_295 })
      ).toBe(UINTEGER);
    });

    it('should return UBIGINT for larger unsigned ranges', () => {
      // 18446744073709551615n
      expect(
        getDuckdbNumberColumnType({ minimum: 0, maximum: 10_000_000_000_000 })
      ).toBe(UBIGINT);
    });

    it('should return UHUGEINT for extremely large unsigned ranges', () => {
      // maximum > 18_446_744_073_709_551_615n
      // Note: number in JS cannot represent this exactly, but let's use a very large number or infinity
      // Actually the code uses BIGINT literals for comparison but params are 'number'
      // Wait, the code has: if (maximum <= 18_446_744_073_709_551_615n)
      // This comparison between number and bigint might be tricky or use bigint if maximum was bigint, but it is defined as number.
      expect(getDuckdbNumberColumnType({ minimum: 0, maximum: 2e20 })).toBe(
        UHUGEINT
      );
    });
  });

  describe('Signed Integers', () => {
    it('should return TINYINT for range [-128, 127]', () => {
      expect(getDuckdbNumberColumnType({ minimum: -128, maximum: 127 })).toBe(
        TINYINT
      );
      expect(getDuckdbNumberColumnType({ minimum: -1, maximum: 1 })).toBe(
        TINYINT
      );
    });

    it('should return SMALLINT for range [-32768, 32767]', () => {
      expect(
        getDuckdbNumberColumnType({ minimum: -32_768, maximum: 32_767 })
      ).toBe(SMALLINT);
      expect(getDuckdbNumberColumnType({ minimum: -129, maximum: 127 })).toBe(
        SMALLINT
      );
    });

    it('should return INTEGER for range [-2147483648, 2147483647]', () => {
      expect(
        getDuckdbNumberColumnType({
          minimum: -2_147_483_648,
          maximum: 2_147_483_647,
        })
      ).toBe(INTEGER);
    });

    it('should return BIGINT for range [-9223372036854775808n, 9223372036854775807n]', () => {
      expect(
        getDuckdbNumberColumnType({
          minimum: -10_000_000_000,
          maximum: 10_000_000_000,
        })
      ).toBe(BIGINT);
    });

    it('should return HUGEINT for extremely large signed ranges', () => {
      expect(getDuckdbNumberColumnType({ minimum: -2e20, maximum: 2e20 })).toBe(
        HUGEINT
      );
    });
  });
});
