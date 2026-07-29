import {
  DuckDBDateValue,
  DuckDBDecimalValue,
  DuckDBTimestampMillisecondsValue,
} from '@duckdb/node-api';

const stringTimestampRegexp =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?Z?$/i;

const dateRegexp = /^\d{4}-\d{2}-\d{2}$/;

const msInDay = 86_400_000;

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
  /**
   *
   * @param value
   */
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
  createDecimalConverter =
    (width: number, scale: number) =>
    (value: number | bigint | null | undefined): DuckDBDecimalValue | null => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === 'number') {
        return DuckDBDecimalValue.fromDouble(value, width, scale);
      }
      if (typeof value === 'bigint') {
        return new DuckDBDecimalValue(value, width, scale);
      }
      throw createDuckValueConverterTypeError({
        method: 'createDecimalConverter',
        value,
      });
    };

  toDate = (value: Date | string | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }

    let dateInMs: number | null = null;
    if (typeof value === 'string' && value.length >= 10 && value.length < 30) {
      const dateStr = value.slice(0, 10);
      const utcDate = new Date(`${dateStr}T00:00:00Z`);
      dateInMs = Math.floor(utcDate.getTime());
    } else if (value instanceof Date) {
      dateInMs = Math.floor(value.getTime());
    }
    if (dateInMs !== null && !Number.isNaN(dateInMs)) {
      return new DuckDBDateValue(Math.floor(dateInMs / msInDay));
    }
    throw createDuckValueConverterTypeError({
      method: 'toDate',
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
