import {
  BIGINT,
  DECIMAL,
  DuckDBDecimalValue,
  DuckDBListValue,
  DuckDBUUIDValue,
  INTEGER,
  LIST,
  UUID,
  VARCHAR,
} from "@duckdb/node-api";
import { describe, expect, it } from "vitest";

import { createDuckColumnConverters } from "./create-duck-column-converters.ts";

describe("createDuckColumnConverter", () => {
  const colDef = {
    one: BIGINT,
  } as const;

  it("should create a converter", () => {
    const map = createDuckColumnConverters(colDef);
    const converter = map.one!;
    expect(converter).toBeInstanceOf(Function);
    expect(converter(10n)).toBe(10n);
  });

  it("should convert list items according to the list value type", () => {
    const map = createDuckColumnConverters({
      bigints: LIST(BIGINT),
      uuids: LIST(UUID),
    });
    expect(map.bigints!([1, "2", null])).toStrictEqual(
      new DuckDBListValue([1n, 2n, null])
    );
    expect(map.uuids!(["019d2155-d292-71fa-87d7-9d1f1ed83569"])).toStrictEqual(
      new DuckDBListValue([
        DuckDBUUIDValue.fromUint128(
          BigInt("0x019d2155d29271fa87d79d1f1ed83569")
        ),
      ])
    );
  });

  it("should not convert list items when not needed", () => {
    const map = createDuckColumnConverters({
      ints: LIST(INTEGER),
      strings: LIST(VARCHAR),
    });
    expect(map.ints!([1, 2])).toStrictEqual(new DuckDBListValue([1, 2]));
    expect(map.strings!(["a"])).toStrictEqual(new DuckDBListValue(["a"]));
  });

  it("should use the column width and scale for decimals", () => {
    const map = createDuckColumnConverters({
      d18_3: DECIMAL(18, 3),
      d10_2: DECIMAL(10, 2),
      d38_10: DECIMAL(38, 10),
    });
    expect(map.d18_3!(1.2345)).toStrictEqual(
      new DuckDBDecimalValue(1235n, 18, 3)
    );
    expect(map.d10_2!(1.2345)).toStrictEqual(
      new DuckDBDecimalValue(123n, 10, 2)
    );
    expect(map.d38_10!(1.2345)).toStrictEqual(
      new DuckDBDecimalValue(12_345_000_000n, 38, 10)
    );
    expect(() => {
      map.d10_2!(123_456_789);
    }).toThrow(RangeError);
  });
});
