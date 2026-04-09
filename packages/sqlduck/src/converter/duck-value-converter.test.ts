import { DuckDBTimestampMillisecondsValue } from '@duckdb/node-api';
import { describe } from 'vitest';

import { DuckValueConverter } from './duck-value-converter.ts';

describe('DuckValueConverter', () => {
  const converter = new DuckValueConverter();
  describe('toBigIntString', () => {
    const expectations = [
      [null, null],
      [undefined, null],
      [222, '222'],
      [333n, '333'],
      [BigInt(555), '555'],
      ['777', '777'],
    ] as const;
    it.each(expectations)('should convert %s to %s', (value, expected) => {
      expect(converter.toBigIntString(value)).toBe(expected);
    });
    it('should throw when invalid value is given', () => {
      // @ts-expect-error testing invalid value
      expect(() => converter.toBigIntString(new Date())).toThrow(
        /\[DuckValueConverter.toBigIntString\]: Unsupported type object with value/
      );
    });
  });
  describe('toTimestamp', () => {
    it('should convert a date to a DuckDBTimestampValue', () => {
      const date = new Date();
      expect(converter.toTimestampMs(date)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()))
      );
    });
    it('should convert an int to a DuckDBTimestampValue', () => {
      const tenSecondsAfterEpoch = 10_000;
      expect(converter.toTimestampMs(tenSecondsAfterEpoch)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(10_000n)
      );
    });
    it('should convert a bigint to a DuckDBTimestampValue', () => {
      const tenSecondsAfterEpochBigInt = 10_000n;
      expect(converter.toTimestampMs(tenSecondsAfterEpochBigInt)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(10_000n)
      );
    });
    it('should convert an isoStringZ timestamp to a DuckDBTimestampValue', () => {
      const isoTimestamp = '2023-12-28T23:37:31.653Z';
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });
    it('should convert an isoString timestamp to a DuckDBTimestampValue', () => {
      const isoTimestamp = '2023-12-28T23:37:31.653';
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });
    it('should convert an isoString timestamp to a DuckDBTimestampValue', () => {
      const isoTimestamp = '2023-12-28 23:37:31.653';
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_653n)
      );
    });
    it('should convert an isoString without milli timestamp to a DuckDBTimestampValue', () => {
      const isoTimestamp = '2023-12-28 23:37:31';
      expect(converter.toTimestampMs(isoTimestamp)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(1_703_806_651_000n)
      );
    });
    it('should convert an YYYY-mm-dd to a DuckDBTimestampValue', () => {
      const dateYmd = '2023-12-28'; // new Date().toISOString()
      expect(converter.toTimestampMs(dateYmd)).toStrictEqual(
        new DuckDBTimestampMillisecondsValue(
          BigInt(new Date(`${dateYmd}T00:00:00.000Z`).getTime())
        )
      );
    });
  });
  it('should convert uuid', () => {
    const uuid = '019d2155-d292-71fa-87d7-9d1f1ed83569';
    expect(converter.toUUID(uuid)).toBe(
      BigInt('0x019d2155d29271fa87d79d1f1ed83569')
    );
  });
});
