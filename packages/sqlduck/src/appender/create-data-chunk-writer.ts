import { createRequire } from "node:module";

import {
  DuckDBDecimalType,
  DuckDBEnumType,
  DuckDBListType,
  DuckDBListValue,
  DuckDBTypeId,
} from "@duckdb/node-api";
import type {
  DuckDBDataChunk,
  DuckDBType,
  DuckDBValue,
} from "@duckdb/node-api";

/**
 * Opaque native vector handle (duckdb_vector).
 */
type RawVector = object;

/**
 * Subset of @duckdb/node-bindings used to write vectors directly.
 */
export type DuckChunkBindings = {
  sizeof_bool: number;
  data_chunk_get_vector: (chunk: object, columnIndex: number) => RawVector;
  vector_ensure_validity_writable: (vector: RawVector) => void;
  vector_assign_string_element: (
    vector: RawVector,
    index: number,
    str: string
  ) => void;
  list_vector_get_child: (vector: RawVector) => RawVector;
  list_vector_set_size: (vector: RawVector, size: number) => void;
  list_vector_reserve: (vector: RawVector, capacity: number) => void;
  copy_data_to_vector: (
    vector: RawVector,
    targetByteOffset: number,
    buffer: ArrayBufferLike,
    sourceByteOffset: number,
    sourceByteCount: number
  ) => void;
  copy_data_to_vector_validity: (
    vector: RawVector,
    targetByteOffset: number,
    buffer: ArrayBufferLike,
    sourceByteOffset: number,
    sourceByteCount: number
  ) => void;
};

const requiredBindingFns = [
  "data_chunk_get_vector",
  "vector_ensure_validity_writable",
  "vector_assign_string_element",
  "list_vector_get_child",
  "list_vector_set_size",
  "list_vector_reserve",
  "copy_data_to_vector",
  "copy_data_to_vector_validity",
] as const;

const isLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/**
 * Load the bindings used by @duckdb/node-api itself, resolved from its own
 * location so native handles are shared. Returns null when not possible.
 */
export const loadDuckChunkBindings = (): DuckChunkBindings | null => {
  try {
    const req = createRequire(import.meta.resolve("@duckdb/node-api"));
    const mod = req("@duckdb/node-bindings") as Record<string, unknown> & {
      default?: Record<string, unknown>;
    };
    const bindings = mod.default ?? mod;
    for (const fn of requiredBindingFns) {
      if (typeof bindings[fn] !== "function") {
        return null;
      }
    }
    return typeof bindings.sizeof_bool === "number"
      ? (bindings as unknown as DuckChunkBindings)
      : null;
  } catch {
    return null;
  }
};

/**
 * Write the first `n` values in a raw vector, throws on invalid values.
 */
type VectorWriter = (
  vector: RawVector,
  values: readonly unknown[],
  n: number
) => void;

/**
 * Validity mask, one bit per row (1 = valid), allocated on the first null.
 * Uint32 words, which matches duckdb uint64 words on little endian.
 */
class Validity {
  #bits: Uint32Array | null = null;
  #n: number;
  constructor(n: number) {
    this.#n = n;
  }
  setNull(i: number) {
    // Rounded to uint64 words, as duckdb expects
    this.#bits ??= new Uint32Array(Math.ceil(this.#n / 64) * 2).fill(
      0xff_ff_ff_ff
    );
    // eslint-disable-next-line no-bitwise
    this.#bits[i >>> 5]! &= ~(1 << (i & 31));
  }
  flush(b: DuckChunkBindings, vector: RawVector) {
    const bits = this.#bits;
    if (bits !== null) {
      b.vector_ensure_validity_writable(vector);
      b.copy_data_to_vector_validity(
        vector,
        0,
        bits.buffer,
        0,
        bits.byteLength
      );
    }
  }
}

const checkSafeInt = (
  v: unknown,
  min: number,
  max: number,
  label: string
): number => {
  if (!Number.isInteger(v)) {
    throw new TypeError(`number is not an integer`);
  }
  if ((v as number) < min || (v as number) > max) {
    throw new Error(`number out of ${label} range`);
  }
  return v as number;
};

const checkInt64 = (v: unknown): bigint => {
  if (BigInt.asIntN(64, v as bigint) !== v) {
    throw new Error(`bigint out of int64 range`);
  }
  return v;
};

const checkUInt64 = (v: unknown): bigint => {
  if (BigInt.asUintN(64, v as bigint) !== v) {
    throw new Error(`bigint out of uint64 range`);
  }
  return v;
};

const copyItems = (
  b: DuckChunkBindings,
  vector: RawVector,
  items: ArrayBufferView,
  validity: Validity
) => {
  b.copy_data_to_vector(vector, 0, items.buffer, 0, items.byteLength);
  validity.flush(b, vector);
};

// Hot types get their own loop: a loop shared by several types (calling a
// per type mapper, storing in different typed arrays) turns megamorphic and
// was measured ~4x slower.

const createFloat64Writer =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new Float64Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = v as number;
      }
    }
    copyItems(b, vector, items, validity);
  };

const createFloat32Writer =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new Float32Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = v as number;
      }
    }
    copyItems(b, vector, items, validity);
  };

const createInt32Writer =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new Int32Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkSafeInt(v, -2_147_483_648, 2_147_483_647, "int32");
      }
    }
    copyItems(b, vector, items, validity);
  };

const createDateWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new Int32Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i] as { days: number } | null | undefined;
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkSafeInt(v.days, -2_147_483_648, 2_147_483_647, "int32");
      }
    }
    copyItems(b, vector, items, validity);
  };

const createBooleanWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new Uint8Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = v ? 1 : 0;
      }
    }
    copyItems(b, vector, items, validity);
  };

const createBigIntWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new BigInt64Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkInt64(v);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createTimestampMsWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new BigInt64Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i] as { millis: bigint } | null | undefined;
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkInt64(v.millis);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createDecimal64Writer =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new BigInt64Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i] as { value: bigint } | null | undefined;
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkInt64(v.value);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createUUIDWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new BigUint64Array(n * 2);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i] as { hugeint: bigint } | null | undefined;
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        const value = v.hugeint;
        if (BigInt.asIntN(128, value) !== value) {
          throw new Error(`bigint out of int128 range`);
        }
        // lower uint64 then upper int64 (two's complement)
        items[i * 2] = BigInt.asUintN(64, value);
        // eslint-disable-next-line no-bitwise
        items[i * 2 + 1] = BigInt.asUintN(64, value >> 64n);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createEnumWriter =
  (
    b: DuckChunkBindings,
    type: DuckDBEnumType,
    Ctor:
      | Uint8ArrayConstructor
      | Uint16ArrayConstructor
      | Uint32ArrayConstructor
  ): VectorWriter =>
  (vector, values, n) => {
    const items = new Ctor(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = type.indexForValue(v as string);
      }
    }
    copyItems(b, vector, items, validity);
  };

type SmallIntArrayCtor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor;

/**
 * Generic writer for the less common integer types.
 */
const createSmallIntWriter =
  (
    b: DuckChunkBindings,
    Ctor: SmallIntArrayCtor,
    min: number,
    max: number,
    label: string
  ): VectorWriter =>
  (vector, values, n) => {
    const items = new Ctor(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkSafeInt(v, min, max, label);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createUBigIntWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const items = new BigUint64Array(n);
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        items[i] = checkUInt64(v);
      }
    }
    copyItems(b, vector, items, validity);
  };

const createVarcharWriter =
  (b: DuckChunkBindings): VectorWriter =>
  (vector, values, n) => {
    const validity = new Validity(n);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v === null || v === undefined) {
        validity.setNull(i);
      } else {
        b.vector_assign_string_element(vector, i, v as string);
      }
    }
    validity.flush(b, vector);
  };

const createListWriter =
  (b: DuckChunkBindings, childWriter: VectorWriter): VectorWriter =>
  (vector, values, n) => {
    // duckdb_list_entry: { offset: uint64, length: uint64 }, written as uint32
    // words (high words stay 0, a chunk child can't hold 2^32 items)
    const entries = new Uint32Array(n * 4);
    const validity = new Validity(n);
    // eslint-disable-next-line unicorn/no-new-array
    const lists = new Array<readonly unknown[] | null>(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const v = values[i];
      let items: readonly unknown[] | null;
      if (v === null || v === undefined) {
        items = null;
        validity.setNull(i);
      } else if (v instanceof DuckDBListValue) {
        items = v.items;
      } else if (Array.isArray(v)) {
        items = v;
      } else {
        throw new TypeError(`A list value was expected`);
      }
      lists[i] = items;
      entries[i * 4] = total;
      const len = items === null ? 0 : items.length;
      entries[i * 4 + 2] = len;
      total += len;
    }
    // eslint-disable-next-line unicorn/no-new-array
    const flat = new Array<unknown>(total);
    let k = 0;
    for (const items of lists) {
      if (items !== null) {
        for (const item of items) {
          flat[k++] = item;
        }
      }
    }
    b.list_vector_reserve(vector, total);
    b.list_vector_set_size(vector, total);
    childWriter(b.list_vector_get_child(vector), flat, total);
    b.copy_data_to_vector(vector, 0, entries.buffer, 0, entries.byteLength);
    validity.flush(b, vector);
  };

/**
 * Returns a writer for the duck type, or null when node-api must be used.
 */
const createVectorWriter = (
  b: DuckChunkBindings,
  type: DuckDBType
): VectorWriter | null => {
  switch (type.typeId) {
    case DuckDBTypeId.BOOLEAN:
      return b.sizeof_bool === 1 ? createBooleanWriter(b) : null;
    case DuckDBTypeId.TINYINT:
      return createSmallIntWriter(b, Int8Array, -128, 127, "int8");
    case DuckDBTypeId.UTINYINT:
      return createSmallIntWriter(b, Uint8Array, 0, 255, "uint8");
    case DuckDBTypeId.SMALLINT:
      return createSmallIntWriter(b, Int16Array, -32_768, 32_767, "int16");
    case DuckDBTypeId.USMALLINT:
      return createSmallIntWriter(b, Uint16Array, 0, 65_535, "uint16");
    case DuckDBTypeId.INTEGER:
      return createInt32Writer(b);
    case DuckDBTypeId.UINTEGER:
      return createSmallIntWriter(b, Uint32Array, 0, 4_294_967_295, "uint32");
    case DuckDBTypeId.FLOAT:
      return createFloat32Writer(b);
    case DuckDBTypeId.DOUBLE:
      return createFloat64Writer(b);
    case DuckDBTypeId.DATE:
      return createDateWriter(b);
    case DuckDBTypeId.BIGINT:
      return createBigIntWriter(b);
    case DuckDBTypeId.UBIGINT:
      return createUBigIntWriter(b);
    case DuckDBTypeId.TIMESTAMP_MS:
      return createTimestampMsWriter(b);
    case DuckDBTypeId.DECIMAL:
      // Widths 10-18 are stored as int64
      return type instanceof DuckDBDecimalType &&
        type.width > 9 &&
        type.width <= 18
        ? createDecimal64Writer(b)
        : null;
    case DuckDBTypeId.UUID:
      return createUUIDWriter(b);
    case DuckDBTypeId.ENUM: {
      if (!(type instanceof DuckDBEnumType)) {
        return null;
      }
      switch (type.internalTypeId) {
        case DuckDBTypeId.UTINYINT:
          return createEnumWriter(b, type, Uint8Array);
        case DuckDBTypeId.USMALLINT:
          return createEnumWriter(b, type, Uint16Array);
        case DuckDBTypeId.UINTEGER:
          return createEnumWriter(b, type, Uint32Array);
        default:
          return null;
      }
    }
    case DuckDBTypeId.VARCHAR:
      return createVarcharWriter(b);
    case DuckDBTypeId.LIST: {
      if (!(type instanceof DuckDBListType)) {
        return null;
      }
      const childWriter = createVectorWriter(b, type.valueType);
      return childWriter === null ? null : createListWriter(b, childWriter);
    }
    default:
      return null;
  }
};

export type DataChunkWriter = (
  chunk: DuckDBDataChunk,
  columns: readonly unknown[][]
) => void;

/**
 * Create a function filling a DuckDBDataChunk from column arrays, the same
 * way `chunk.setColumns(columns)` does, but writing supported types directly
 * in the native vectors (typed arrays and bulk copies) instead of going
 * through node-api per item vectors. Unsupported types, or every column when
 * the bindings can't be loaded (or `bindings` is null), use node-api.
 */
export const createDataChunkWriter = (
  types: readonly DuckDBType[],
  bindings: DuckChunkBindings | null = isLittleEndian
    ? loadDuckChunkBindings()
    : null
): DataChunkWriter => {
  const fallback: DataChunkWriter = (chunk, columns) => {
    chunk.setColumns(columns as DuckDBValue[][]);
  };
  if (bindings === null) {
    return fallback;
  }
  const b = bindings;
  const writers = types.map((t) => createVectorWriter(b, t));
  if (writers.every((w) => w === null)) {
    return fallback;
  }
  const numColumns = types.length;
  return (chunk, columns) => {
    if (columns.length !== numColumns) {
      throw new Error(`Expected ${numColumns} columns, got ${columns.length}`);
    }
    const n = columns[0]?.length ?? 0;
    chunk.rowCount = n;
    for (let i = 0; i < numColumns; i++) {
      const values = columns[i]!;
      if (values.length !== n) {
        throw new Error(`number of values must equal chunk row count`);
      }
      const writer = writers[i];
      if (writer === null || writer === undefined) {
        chunk.setColumnValues(i, values as DuckDBValue[]);
      } else {
        writer(b.data_chunk_get_vector(chunk.chunk, i), values, n);
      }
    }
  };
};
