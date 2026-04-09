import { DuckDBTimestampMillisecondsValue } from '@duckdb/node-api';

const stringTimestampRegexp =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?Z?$/i;

const dateRegexp = /^\d{4}-\d{2}-\d{2}$/;

const createDuckValueConverterTypeError = (params: {
  method: keyof typeof DuckValueConverter.prototype;
  value: unknown;
}) => {
  let serializableValue: string;
  try {
    serializableValue = JSON.stringify(params.value);
  } catch {
    serializableValue = '<unserializable>';
  }
  return new TypeError(
    `[DuckValueConverter.${params.method}]: Unsupported type ${typeof params.value} with value ${serializableValue}`
  );
};

export class DuckValueConverter {
  toUUID = (value: string | bigint | null | undefined): bigint | null => {
    if (typeof value === 'bigint') {
      return value;
    } else if (typeof value === 'string') {
      return BigInt('0x' + value.replaceAll('-', ''));
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: 'toUUID',
      value,
    });
  };
  toStringEnum = (value: string | null | undefined): string | null => {
    if (typeof value === 'string') {
      return value;
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: 'toStringEnum',
      value,
    });
  };
  toBigIntString = (
    value: string | number | bigint | null | undefined
  ): string | null => {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString(10);
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: 'toBigIntString',
      value,
    });
  };
  toTimestampMs = (
    value: bigint | number | Date | null | string | undefined
  ): DuckDBTimestampMillisecondsValue | null => {
    if (value instanceof Date) {
      return new DuckDBTimestampMillisecondsValue(BigInt(value.getTime()));
    }
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string') {
      const len = value.length;
      if (len > 18 && len < 31 && stringTimestampRegexp.test(value)) {
        const date = new Date(value + (value.endsWith('Z') ? '' : 'Z'));
        return new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()));
      }
      if (len === 10 && dateRegexp.test(value)) {
        const date = new Date(value + 'T00:00:00Z');
        return new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()));
      }
    }
    if (typeof value === 'bigint') {
      return new DuckDBTimestampMillisecondsValue(value);
    }
    if (typeof value === 'number') {
      return new DuckDBTimestampMillisecondsValue(BigInt(value));
    }
    throw createDuckValueConverterTypeError({ method: 'toTimestampMs', value });
  };
}
