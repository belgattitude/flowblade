import { sql } from "@flowblade/sql-tag";
import { describe, expect, expectTypeOf, it } from "vitest";

import { QMeta } from "../meta/q-meta";
import { DummyDatasource } from "../testing/dummy-datasource";
import {
  createQResultError,
  createQResultSuccess,
} from "../utils/datasource.factories";
import { QResult } from "./q-result";
import type { QError } from "./types";

type Row = { id: number };

const getResult = (fail: boolean): QResult<Row[], QError> =>
  fail
    ? createQResultError(
        { message: "failed", code: "QUERY_FAILED" },
        new QMeta({})
      )
    : createQResultSuccess<Row[]>([{ id: 1 }], new QMeta({}));

describe("QResult discriminated union", () => {
  it("should narrow data after destructuring", () => {
    const { data, error } = getResult(false);
    expectTypeOf(data).toEqualTypeOf<Row[] | undefined>();
    if (error) {
      expectTypeOf(error).toEqualTypeOf<QError>();
      expectTypeOf(data).toEqualTypeOf<undefined>();
      throw new Error("Should not fail");
    }
    expectTypeOf(data).toEqualTypeOf<Row[]>();
    expect(data).toStrictEqual([{ id: 1 }]);
  });

  it("should narrow error when data is defined", () => {
    const { data, error } = getResult(true);
    if (data !== undefined) {
      expectTypeOf(error).toEqualTypeOf<undefined>();
      throw new Error("Should fail");
    }
    expectTypeOf(error).toEqualTypeOf<QError>();
    expect(error.message).toBe("failed");
  });

  it("should narrow the result object", () => {
    const result = getResult(false);
    if (result.error !== undefined) {
      throw new Error("Should not fail");
    }
    expectTypeOf(result.data).toEqualTypeOf<Row[]>();
    expect(result).toBeInstanceOf(QResult);
  });

  it("should narrow with isOk() and isError()", () => {
    const success = getResult(false);
    if (!success.isOk()) {
      expectTypeOf(success.error).toEqualTypeOf<QError>();
      throw new Error("Should not fail");
    }
    expectTypeOf(success.data).toEqualTypeOf<Row[]>();
    expectTypeOf(success.error).toEqualTypeOf<undefined>();
    expect(success.data).toStrictEqual([{ id: 1 }]);

    const failure = getResult(true);
    if (!failure.isError()) {
      expectTypeOf(failure.data).toEqualTypeOf<Row[]>();
      throw new Error("Should fail");
    }
    expectTypeOf(failure.error).toEqualTypeOf<QError>();
    expectTypeOf(failure.data).toEqualTypeOf<undefined>();
    expect(failure.error.code).toBe("QUERY_FAILED");
    // the result methods are still available after narrowing
    expect(failure.toJsonifiable().error?.code).toBe("QUERY_FAILED");
  });

  it("should narrow mapped results", () => {
    const { data, error } = getResult(false).map((row) => {
      return { id: String(row.id) };
    });
    if (error) {
      throw new Error("Should not fail");
    }
    expectTypeOf(data).toEqualTypeOf<{ id: string }[]>();
    expect(data).toStrictEqual([{ id: "1" }]);
  });

  it("should only have a success variant without error type", () => {
    const { data } = createQResultSuccess<Row[]>([{ id: 1 }], new QMeta({}));
    expectTypeOf(data).toEqualTypeOf<Row[]>();
  });

  it("should narrow datasource query and queryOne results", async () => {
    const ds = new DummyDatasource({ connection: null });
    const { data, error } = await ds.query(sql<Row>`SELECT 1 as id`);
    if (error) {
      throw new Error("Should not fail");
    }
    expectTypeOf(data).toEqualTypeOf<Row[]>();

    const one = await ds.queryOne(sql<Row>`SELECT 1 as id`);
    if (one.error) {
      expectTypeOf(one.error).toEqualTypeOf<QError>();
      return;
    }
    expectTypeOf(one.data).toEqualTypeOf<Row | null>();
  });
});
