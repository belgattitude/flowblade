import {
  DuckDBDateValue,
  DuckDBDecimalValue,
  DuckDBListValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBUUIDValue,
} from "@duckdb/node-api";
import { describe, expect, it } from "vitest";

import { DuckValueConverter } from "./duck-value-converter.ts";

describe(DuckValueConverter, () => {
  const converter = new DuckValueConverter();
  describe("toBigInt", () => {
    const expectations = [
      [null, null],
      [undefined, null],
      [222, 222n],
      [333n, 333n],
      [BigInt(555), 555n],
      ["777", 777n],
    ] as const;

    it.each(expectations)("should convert %s to %s", (value, expected) => {
      expect(converter.toBigInt(value)).toBe(expected);
    });

    it("should throw when invalid value is given", () => {
      // @ts-expect-error testing invalid value
      expect(() => converter.toBigInt(new Date())).toThrow(
        /\[DuckValueConverter.toBigInt\]: Unsupported type object with value/
      );
    });
  });
  describe("toTimestamp", () => {
    it("should convert a date to a DuckDBTimestampValue", () => {
      const date = new Date();
      expect(converter.toTimestampMs(date)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()))
      );
    });

    it("should convert an int to a DuckDBTimestampValue", () => {
      const tenSecondsAfterEpoch = 10_000;
      expect(converter.toTimestampMs(tenSecondsAfterEpoch)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(10_000n)
      );
    });

    it("should convert a bigint to a DuckDBTimestampValue", () => {
      const tenSecondsAfterEpochBigInt = 10_000n;
      expect(converter.toTimestampMs(tenSecondsAfterEpochBigInt)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(10_000n)
      );
    });

    it("should convert an isoStringZ timestamp to a DuckDBTimestampValue", () => {
      const isoTimestamp = "2023-12-28T23:37:31.653Z";
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });

    it("should convert an isoString timestamp to a DuckDBTimestampValue", () => {
      const isoTimestamp = "2023-12-28T23:37:31.653";
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });

    it("should convert an isoString timestamp with a space separator to a DuckDBTimestampValue", () => {
      const isoTimestamp = "2023-12-28 23:37:31.653";
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });

    it("should convert an isoString without milli timestamp to a DuckDBTimestampValue", () => {
      const isoTimestamp = "2023-12-28 23:37:31";
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_000n)
      );
    });

    it("should convert an YYYY-mm-dd to a DuckDBTimestampValue", () => {
      const dateYmd = "2026-12-28"; // new Date().toISOString()
      expect(converter.toTimestampMs(dateYmd)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(
          BigInt(new Date(`${dateYmd}T00:00:00.000Z`).getTime())
        )
      );
    });
  });
  describe("toDate", () => {
    it("should convert string date ymd", () => {
      const dateStrYmd = "2026-12-28";
      expect(converter.toDate(dateStrYmd)).toStrictEqual(
        new DuckDBDateValue(20_815)
      );
    });

    it("should convert iso string date (ignoring tz)", () => {
      const isoDateStr = "2026-12-28T23:59:59.653Z";
      expect(converter.toDate(isoDateStr)).toStrictEqual(
        new DuckDBDateValue(20_815)
      );
    });

    it("should accept a date", () => {
      const isoDate = new Date("2026-12-28T23:59:59.653Z");
      expect(converter.toDate(isoDate)).toStrictEqual(
        new DuckDBDateValue(20_815)
      );
    });

    it("should throw when the date is garbage", () => {
      const garbageDate = "2026-30-30";
      expect(() => converter.toDate(garbageDate)).toThrow(
        '[DuckValueConverter.toDate]: Unsupported type string with value "2026-30-30"'
      );
    });

    it("should return null when undefined is given", () => {
      expect(converter.toDate(undefined)).toBeNull();
    });

    it("should return null when null is given", () => {
      expect(converter.toDate(null)).toBeNull();
    });

    it("should throw when a boolean is given", () => {
      // @ts-expect-error for testing
      expect(() => converter.toDate(true)).toThrow(
        "[DuckValueConverter.toDate]: Unsupported type boolean with value true"
      );
    });
  });
  describe("toUUID", () => {
    it.each([
      "019d2155-d292-71fa-87d7-9d1f1ed83569",
      "019d2155d29271fa87d79d1f1ed83569",
      "019D2155-D292-71FA-87D7-9D1F1ED83569",
    ])("should convert %s to a DuckDBUUIDValue", (uuid) => {
      const value = converter.toUUID(uuid);
      expect(value).toBeInstanceOf(DuckDBUUIDValue);
      expect(value?.toString()).toBe("019d2155-d292-71fa-87d7-9d1f1ed83569");
      expect(value?.toUint128()).toBe(
        BigInt("0x019d2155d29271fa87d79d1f1ed83569")
      );
    });

    it.each([
      "00000000-0000-0000-0000-000000000000",
      "80000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ])("should round trip %s", (uuid) => {
      expect(converter.toUUID(uuid)?.toString()).toBe(uuid);
    });

    it("should convert an unsigned 128-bit bigint", () => {
      const uint128 = BigInt("0x019d2155d29271fa87d79d1f1ed83569");
      expect(converter.toUUID(uint128)).toStrictEqual(
        DuckDBUUIDValue.fromUint128(uint128)
      );
    });

    it("should return null for null or undefined", () => {
      expect(converter.toUUID(null)).toBeNull();
      expect(converter.toUUID(undefined)).toBeNull();
    });

    it("should throw on invalid values", () => {
      // @ts-expect-error testing invalid value
      expect(() => converter.toUUID(1)).toThrow(
        "[DuckValueConverter.toUUID]: Unsupported type number with value 1"
      );
      expect(() => converter.toUUID("not-a-uuid")).toThrow(SyntaxError);
    });
  });
  describe("createListConverter", () => {
    it("should convert each item", () => {
      const toBigIntList = converter.createListConverter(converter.toBigInt);
      expect(toBigIntList([1, "2", 3n, null])).toStrictEqual(
        new DuckDBListValue([1n, 2n, 3n, null])
      );
      expect(toBigIntList([])).toStrictEqual(new DuckDBListValue([]));
    });

    it("should return null for null or undefined", () => {
      const toBigIntList = converter.createListConverter(converter.toBigInt);
      expect(toBigIntList(null)).toBeNull();
      expect(toBigIntList(undefined)).toBeNull();
    });
  });
  describe("string date fast path parity with Date parsing", () => {
    const timestamps = [
      "2023-12-28 23:37:31",
      "2023-12-28t23:37:31.653",
      "2023-12-28T23:37:31.653999Z",
      // day overflow rolls over to the next month, like Date parsing
      "2025-02-30T10:00:00Z",
      // years 0-99 must not be mapped to 1900-1999
      "0050-01-01T00:00:00Z",
      "2025-01-01T24:00:00Z",
      "2025-01-01T24:00:00z",
    ];

    it.each(timestamps)("toTimestampMs(%s)", (value) => {
      const expected = new Date(/z$/i.test(value) ? value : `${value}Z`);
      expect(converter.toTimestampMs(value)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(BigInt(expected.getTime()))
      );
    });

    it.each(["2025-02-30", "0050-01-01", "2025-01-31T23:59:59Z"])(
      "toDate(%s)",
      (value) => {
        const expected = new Date(`${value.slice(0, 10)}T00:00:00Z`);
        expect(converter.toDate(value)).toStrictEqual(
          new DuckDBDateValue(expected.getTime() / 86_400_000)
        );
      }
    );

    it.each([
      ["2023-12-28T23:37:31.653z", 1_703_806_651_653n],
      ["2023-12-28 23:37:31z", 1_703_806_651_000n],
      ["2023-12-28T23:37:31.653999z", 1_703_806_651_653n],
    ] as const)("should accept a lowercase z in %s", (value, expected) => {
      expect(converter.toTimestampMs(value)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(expected)
      );
    });

    it.each(["2025-13-01T00:00:00Z", "2025-01-01T23:60:00Z", "2025-00-01"])(
      "should throw on invalid timestamp %s",
      (value) => {
        expect(() => converter.toTimestampMs(value)).toThrow(
          "cannot be converted to a BigInt"
        );
      }
    );
  });
  describe("createDecimalConverter", () => {
    it.each([
      [1.2345, 1235n],
      [-1.2345, -1235n],
      [0.0005, 1n],
      [-0.0005, -1n],
      [-0, 0n],
      [123_456_789_012.345, 123_456_789_012_345n],
    ] as const)("should round %s half away from zero", (value, expected) => {
      const toDecimal = converter.createDecimalConverter(18, 3);
      expect(toDecimal(value)).toStrictEqual(
        DuckDBDecimalValue.fromDouble(value, 18, 3)
      );
      expect(toDecimal(value)?.value).toBe(expected);
    });

    it.each([
      1e15,
      -1e15,
      2 ** 53,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("should throw for out of range value %s", (value) => {
      const toDecimal = converter.createDecimalConverter(18, 3);
      expect(() => toDecimal(value)).toThrow(RangeError);
      expect(() => toDecimal(value)).toThrow(
        `[DuckValueConverter.createDecimalConverter]: Value ${value} does not fit in DECIMAL(18,3)`
      );
    });

    it("should throw when rounding overflows the width", () => {
      const toDecimal = converter.createDecimalConverter(4, 2);
      expect(toDecimal(99.99)?.value).toBe(9999n);
      expect(() => toDecimal(99.995)).toThrow(RangeError);
    });

    it("should match native conversion beyond safe integer range", () => {
      const toDecimal = converter.createDecimalConverter(18, 3);
      const value = 123_456_789_012_345.67;
      expect(toDecimal(value)).toStrictEqual(
        DuckDBDecimalValue.fromDouble(value, 18, 3)
      );
    });

    it("should keep bigint values as is", () => {
      const toDecimal = converter.createDecimalConverter(18, 3);
      expect(toDecimal(1234n)).toStrictEqual(
        new DuckDBDecimalValue(1234n, 18, 3)
      );
    });
  });
});
