import {
  DuckDBDateValue,
  DuckDBDecimalValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBUUIDValue,
  listValue,
} from "@duckdb/node-api";
import type { DuckDBValue } from "@duckdb/node-api";

const stringTimestampRegexp =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?Z?$/i;

const dateRegexp = /^\d{4}-\d{2}-\d{2}$/;

const msInDay = 86_400_000;

const charDash = 45; // -
const charColon = 58; // :
const charDot = 46; // .
const charSpace = 32; // " "
const charUpperT = 84; // T
const charLowerT = 116; // t
const charUpperZ = 90; // Z
const charLowerZ = 122; // z

/**
 * Parse `len` ascii digits starting at `start`, returns -1 if a non-digit is found.
 */
const parseDigits = (value: string, start: number, len: number): number => {
  let n = 0;
  for (let i = start; i < start + len; i++) {
    const d = (value.codePointAt(i) ?? 0) - 48;
    if (d < 0 || d > 9) {
      return -1;
    }
    n = n * 10 + d;
  }
  return n;
};

/**
 * Fast path for a leading `YYYY-MM-DD`, returns the UTC epoch in ms or NaN
 * when the string can't be handled (caller must fall back to Date parsing).
 * Days 29-31 roll over to the next month, the same way V8 Date parsing does.
 */
const parseIsoDateToMs = (value: string): number => {
  if (value.codePointAt(4) !== charDash || value.codePointAt(7) !== charDash) {
    return Number.NaN;
  }
  const year = parseDigits(value, 0, 4);
  const month = parseDigits(value, 5, 2);
  const day = parseDigits(value, 8, 2);
  // Date.UTC maps years 0-99 to 1900-1999, leave those to the slow path
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return Number.NaN;
  }
  return Date.UTC(year, month - 1, day);
};

/**
 * Fast path for `YYYY-MM-DD[T ]HH:mm:ss(.SSS[SSS])?Z?`, returns the UTC epoch
 * in ms or NaN when the string can't be handled (caller must fall back to
 * Date parsing). Sub-millisecond digits are truncated, like V8 does.
 */
const parseIsoTimestampToMs = (value: string): number => {
  const len = value.length;
  const sep = value.codePointAt(10);
  if (
    (sep !== charUpperT && sep !== charLowerT && sep !== charSpace) ||
    value.codePointAt(13) !== charColon ||
    value.codePointAt(16) !== charColon
  ) {
    return Number.NaN;
  }
  const last = value.codePointAt(len - 1);
  let end = last === charUpperZ || last === charLowerZ ? len - 1 : len;
  let ms = 0;
  if (end > 19) {
    const fractionLen = end - 20;
    if (
      value.codePointAt(19) !== charDot ||
      fractionLen < 3 ||
      fractionLen > 6 ||
      parseDigits(value, 23, fractionLen - 3) === -1
    ) {
      return Number.NaN;
    }
    ms = parseDigits(value, 20, 3);
    end = 19;
  }
  if (end !== 19) {
    return Number.NaN;
  }
  const hours = parseDigits(value, 11, 2);
  const minutes = parseDigits(value, 14, 2);
  const seconds = parseDigits(value, 17, 2);
  if (ms === -1 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return Number.NaN;
  }
  if (seconds < 0 || seconds > 59) {
    return Number.NaN;
  }
  const dateMs = parseIsoDateToMs(value);
  return Number.isNaN(dateMs)
    ? dateMs
    : dateMs + hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + ms;
};

const isDashedUUID = (value: string): boolean =>
  value.length === 36 &&
  value.codePointAt(8) === charDash &&
  value.codePointAt(13) === charDash &&
  value.codePointAt(18) === charDash &&
  value.codePointAt(23) === charDash;

const createDuckValueConverterTypeError = (params: {
  method: keyof typeof DuckValueConverter.prototype;
  value: unknown;
}): TypeError => {
  let serializableValue: string;
  try {
    serializableValue = JSON.stringify(params.value);
  } catch {
    serializableValue = "<unserializable>";
  }
  return new TypeError(
    `[DuckValueConverter.${params.method}]: Unsupported type ${typeof params.value} with value ${serializableValue}`
  );
};

export class DuckValueConverter {
  /**
   * Bigint values are expected to be the unsigned 128-bit representation of
   * the uuid (ie: BigInt("0x019d2155d29271fa87d79d1f1ed83569")).
   */
  toUUID = (
    value: string | bigint | null | undefined
  ): DuckDBUUIDValue | null => {
    if (typeof value === "bigint") {
      return DuckDBUUIDValue.fromUint128(value);
    } else if (typeof value === "string") {
      const hex = isDashedUUID(value)
        ? value.slice(0, 8) +
          value.slice(9, 13) +
          value.slice(14, 18) +
          value.slice(19, 23) +
          value.slice(24)
        : value.replaceAll("-", "");
      return DuckDBUUIDValue.fromUint128(BigInt("0x" + hex));
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: "toUUID",
      value,
    });
  };
  toStringEnum = (value: string | null | undefined): string | null => {
    if (typeof value === "string") {
      return value;
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: "toStringEnum",
      value,
    });
  };
  createDecimalConverter = (width: number, scale: number) => {
    const scaleFactor = 10 ** scale;
    const maxScaled = 10 ** width;
    return (
      value: number | bigint | null | undefined
    ): DuckDBDecimalValue | null => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === "number") {
        // Rounds half away from zero like duckdb_double_to_decimal does
        const scaled = value * scaleFactor;
        const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
        // duckdb_double_to_decimal silently returns 0 for non-finite or out
        // of range values, NaN fails both comparisons
        if (!(rounded < maxScaled && rounded > -maxScaled)) {
          throw new RangeError(
            `[DuckValueConverter.createDecimalConverter]: Value ${value} does not fit in DECIMAL(${width},${scale})`
          );
        }
        // Avoid the native call when the scaled value is exactly representable
        if (
          rounded < Number.MAX_SAFE_INTEGER &&
          rounded > -Number.MAX_SAFE_INTEGER
        ) {
          return new DuckDBDecimalValue(BigInt(rounded), width, scale);
        }
        return DuckDBDecimalValue.fromDouble(value, width, scale);
      }
      if (typeof value === "bigint") {
        return new DuckDBDecimalValue(value, width, scale);
      }
      throw createDuckValueConverterTypeError({
        method: "createDecimalConverter",
        value,
      });
    };
  };

  toDate = (value: Date | string | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }

    let dateInMs: number | null = null;
    if (typeof value === "string" && value.length >= 10 && value.length < 30) {
      dateInMs = parseIsoDateToMs(value);
      if (Number.isNaN(dateInMs)) {
        const dateStr = value.slice(0, 10);
        const utcDate = new Date(`${dateStr}T00:00:00Z`);
        dateInMs = Math.floor(utcDate.getTime());
      }
    } else if (value instanceof Date) {
      dateInMs = Math.floor(value.getTime());
    }
    if (dateInMs !== null && !Number.isNaN(dateInMs)) {
      return new DuckDBDateValue(Math.floor(dateInMs / msInDay));
    }
    throw createDuckValueConverterTypeError({
      method: "toDate",
      value,
    });
  };
  toBigInt = (
    value: string | number | bigint | null | undefined
  ): bigint | null => {
    if (typeof value === "bigint") {
      return value;
    }
    if (typeof value === "string" || typeof value === "number") {
      return BigInt(value);
    }
    if (value === undefined || value === null) {
      return null;
    }
    throw createDuckValueConverterTypeError({
      method: "toBigInt",
      value,
    });
  };
  toList = (
    arrayValue: (string | number | boolean | bigint | null)[] | null | undefined
  ) => {
    if (arrayValue === undefined || arrayValue === null) {
      return null;
    }
    return listValue(arrayValue);
  };
  /**
   * Create a list converter applying `itemConverter` to each item, ie: to
   * convert numbers or strings items to bigint for a BIGINT[] column.
   */
  createListConverter =
    (itemConverter: (item: never) => DuckDBValue) =>
    (arrayValue: readonly unknown[] | null | undefined) => {
      if (arrayValue === undefined || arrayValue === null) {
        return null;
      }
      const len = arrayValue.length;
      // eslint-disable-next-line unicorn/no-new-array
      const items = new Array<DuckDBValue>(len);
      for (let i = 0; i < len; i++) {
        items[i] = itemConverter(arrayValue[i] as never);
      }
      return listValue(items);
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

    if (typeof value === "string") {
      const len = value.length;
      let fastMs = Number.NaN;
      if (len === 10) {
        fastMs = parseIsoDateToMs(value);
      } else if (len > 18 && len < 31) {
        fastMs = parseIsoTimestampToMs(value);
      }
      if (!Number.isNaN(fastMs)) {
        return new DuckDBTimestampMillisecondsValue(BigInt(fastMs));
      }
      if (len > 18 && len < 31 && stringTimestampRegexp.test(value)) {
        const hasZ = value.endsWith("Z") || value.endsWith("z");
        const date = new Date(hasZ ? value : value + "Z");
        return new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()));
      }
      if (len === 10 && dateRegexp.test(value)) {
        const date = new Date(value + "T00:00:00Z");
        return new DuckDBTimestampMillisecondsValue(BigInt(date.getTime()));
      }
    }
    if (typeof value === "bigint") {
      return new DuckDBTimestampMillisecondsValue(value);
    }
    if (typeof value === "number") {
      return new DuckDBTimestampMillisecondsValue(BigInt(value));
    }
    throw createDuckValueConverterTypeError({ method: "toTimestampMs", value });
  };
}
