import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { QNoResultError } from "../errors/q-no-result-error";
import type {
  QNoResultErrorFactory,
  QTooManyResultsErrorFactory,
} from "../errors/q-one-row-error-factories";
import { QTooManyResultsError } from "../errors/q-too-many-results-error";
import { QMeta } from "../meta/q-meta";
import type { QResult } from "../query-result/q-result";
import type { QError } from "../query-result/types";
import {
  createQResultError,
  createQResultSuccess,
  getOneRowOrThrow,
  toOneRowQResult,
} from "./datasource.factories";

describe(toOneRowQResult, () => {
  type Row = { id: number };
  const meta = new QMeta({ name: "test" });

  it("should return the row when there's exactly one", () => {
    const result = toOneRowQResult(
      createQResultSuccess<Row[]>([{ id: 1 }], meta)
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toStrictEqual({ id: 1 });
    expect(result.meta).toBe(meta);
    expectTypeOf(result).toEqualTypeOf<QResult<Row | null, QError>>();
  });

  it("should return null when there's no row", () => {
    const result = toOneRowQResult(createQResultSuccess<Row[]>([], meta));
    expect(result.error).toBeUndefined();
    expect(result.data).toBeNull();
    expect(result.meta).toBe(meta);
    expect(result.toJsonifiable()).toStrictEqual({
      data: null,
      meta: meta.toJSON(),
    });
  });

  it("should map the row and keep null", () => {
    const mapped = toOneRowQResult(
      createQResultSuccess<Row[]>([{ id: 1 }], meta)
    ).map((row) => {
      return { key: `key-${row.id}` };
    });
    expect(mapped.data).toStrictEqual({ key: "key-1" });
    expectTypeOf(mapped.data).toEqualTypeOf<
      { key: string } | null | undefined
    >();

    const transformFn = vi.fn<(row: Row) => { key: string }>();
    const mappedNull = toOneRowQResult(
      createQResultSuccess<Row[]>([], meta)
    ).map(transformFn);
    expect(mappedNull.error).toBeUndefined();
    expect(mappedNull.data).toBeNull();
    expect(transformFn).not.toHaveBeenCalled();
  });

  it("should return a TOO_MANY_RESULTS error when there's more than one row", () => {
    const result = toOneRowQResult(
      createQResultSuccess<Row[]>([{ id: 1 }, { id: 2 }], meta)
    );
    expect(result.data).toBeUndefined();
    expect(result.error).toStrictEqual({
      message: "Expected exactly one row, received 2",
      code: "TOO_MANY_RESULTS",
      cause: expect.any(QTooManyResultsError),
    });
    expect(result.error?.cause).toMatchObject({
      code: "TOO_MANY_RESULTS",
      rowCount: 2,
    });
    // The code is serializable, the cause never is
    expect(result.toJsonifiable().error).toStrictEqual({
      message: "Expected exactly one row, received 2",
      code: "TOO_MANY_RESULTS",
    });
  });

  it("should keep the original error on failure", () => {
    const cause = new Error("driver error");
    const result = toOneRowQResult(
      createQResultError({ message: "driver error", cause }, meta) as QResult<
        Row[],
        QError
      >
    );
    expect(result.error).toStrictEqual({ message: "driver error", cause });
    expect(result.meta).toBe(meta);
  });
});

describe(getOneRowOrThrow, () => {
  type Row = { id: number };
  const meta = new QMeta({ name: "test" });
  const one = () =>
    toOneRowQResult(createQResultSuccess<Row[]>([{ id: 1 }], meta));
  const none = () => toOneRowQResult(createQResultSuccess<Row[]>([], meta));
  const many = () =>
    toOneRowQResult(createQResultSuccess<Row[]>([{ id: 1 }, { id: 2 }], meta));

  it("should return the row", () => {
    const row = getOneRowOrThrow(one());
    expect(row).toStrictEqual({ id: 1 });
    expectTypeOf(row).toEqualTypeOf<Row>();
  });

  it("should throw the default row count errors", () => {
    expect(() => getOneRowOrThrow(none())).toThrow(QNoResultError);
    expect(() => getOneRowOrThrow(many())).toThrow(QTooManyResultsError);
  });

  it("should throw the factory errors with the default error and context", () => {
    const onNoResult = vi.fn<QNoResultErrorFactory>(
      ({ error }) => new Error("not found", { cause: error })
    );
    const onTooManyResults = vi.fn<QTooManyResultsErrorFactory>(
      ({ rowCount }) => new Error(`got ${rowCount}`)
    );
    expect(() => getOneRowOrThrow(none(), { onNoResult })).toThrow(
      expect.objectContaining({
        message: "not found",
        cause: expect.any(QNoResultError),
      })
    );
    expect(onNoResult).toHaveBeenCalledExactlyOnceWith({
      error: expect.any(QNoResultError),
      meta,
    });
    expect(() => getOneRowOrThrow(many(), { onTooManyResults })).toThrow(
      "got 2"
    );
    expect(onTooManyResults).toHaveBeenCalledExactlyOnceWith({
      error: expect.any(QTooManyResultsError),
      rowCount: 2,
      meta,
    });
  });

  it("should use the first factory defined", () => {
    const options = { onNoResult: () => new Error("from options") };
    const defaults = {
      onNoResult: () => new Error("from defaults"),
      onTooManyResults: () => new Error("too many from defaults"),
    };
    expect(() => getOneRowOrThrow(none(), options, defaults)).toThrow(
      "from options"
    );
    expect(() => getOneRowOrThrow(none(), undefined, defaults)).toThrow(
      "from defaults"
    );
    // Not set in options, falls back to the defaults
    expect(() => getOneRowOrThrow(many(), options, defaults)).toThrow(
      "too many from defaults"
    );
  });

  describe("defaultValue", () => {
    const defaultRow = { id: 0 };

    it("should return the default value when there's no row", () => {
      const row = getOneRowOrThrow(none(), { defaultValue: defaultRow });
      expect(row).toBe(defaultRow);
      expectTypeOf(row).toEqualTypeOf<Row | { id: number }>();
    });

    it("should accept null as default value", () => {
      const row = getOneRowOrThrow(none(), { defaultValue: null });
      expect(row).toBeNull();
      expectTypeOf(row).toEqualTypeOf<Row | null>();
    });

    it("should return the row when there's one", () => {
      expect(
        getOneRowOrThrow(one(), { defaultValue: defaultRow })
      ).toStrictEqual({ id: 1 });
    });

    it("should win over the default onNoResult factory", () => {
      const onNoResult = vi.fn<QNoResultErrorFactory>(
        () => new Error("not found")
      );
      expect(
        getOneRowOrThrow(none(), { defaultValue: defaultRow }, { onNoResult })
      ).toBe(defaultRow);
      expect(onNoResult).not.toHaveBeenCalled();
    });

    it("should still throw when there's more than one row or on failure", () => {
      expect(() =>
        getOneRowOrThrow(many(), { defaultValue: defaultRow })
      ).toThrow(QTooManyResultsError);
      const failed = toOneRowQResult(
        createQResultError({ message: "driver error" }, meta) as QResult<
          Row[],
          QError
        >
      );
      expect(() =>
        getOneRowOrThrow(failed, { defaultValue: defaultRow })
      ).toThrow("Query failed: driver error");
    });

    it("should not allow onNoResult with a defaultValue", () => {
      expect(() =>
        getOneRowOrThrow(none(), {
          defaultValue: defaultRow,
          // @ts-expect-error onNoResult and defaultValue are mutually exclusive
          onNoResult: () => new Error("not found"),
        })
      ).not.toThrow();
    });
  });

  it("should throw a query failed error without calling the factories", () => {
    const cause = new Error("driver error");
    const onNoResult = vi.fn<QNoResultErrorFactory>(
      () => new Error("not found")
    );
    const failed = toOneRowQResult(
      createQResultError({ message: "driver error", cause }, meta) as QResult<
        Row[],
        QError
      >
    );
    expect(() => getOneRowOrThrow(failed, { onNoResult })).toThrow(
      expect.objectContaining({ message: "Query failed: driver error", cause })
    );
    expect(onNoResult).not.toHaveBeenCalled();
  });
});
