import {
  expectTypeOf,
  beforeEach,
  vi,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import * as QErrors from "../errors/index";
import type {
  QErrorFactory,
  QTooManyResultsErrorFactory,
} from "../errors/q-error-factories";
import {
  QMeta,
  type QMetaSpan,
  type QMetaJsonifiable,
  type QMetaSqlSpan,
} from "../meta/q-meta";
import { QResult } from "./q-result";
import type { QError } from "./types";

describe(QResult, () => {
  const initialSqlSpan: QMetaSqlSpan = {
    type: "sql",
    timeMs: 12,
    sql: "SELECT name FROM users",
    affectedRows: 10,
    params: [],
  };

  type SuccessData = { name: string }[];
  const successData: SuccessData = [{ name: "Sébastien" }];

  const createSuccessResult = () =>
    new QResult({
      data: successData,
      meta: new QMeta({ spans: initialSqlSpan }),
    });

  const createErrorResult = (errMsg?: string) =>
    new QResult<{ name: string }[], QError>({
      error: {
        message: errMsg ?? "An error occurred",
        code: "QUERY_FAILED",
      },
      meta: new QMeta({ spans: initialSqlSpan }),
    });

  beforeEach(() => {
    vi.useFakeTimers();
    // Start from a known point in time
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    describe("With a success result", () => {
      const successResult = createSuccessResult();

      it("should type the data as optional", () => {
        expectTypeOf(successResult.data).toEqualTypeOf<
          { name: string }[] | undefined
        >();
      });

      it("should type the error as optional", () => {
        expectTypeOf(successResult.error).toEqualTypeOf<QError | undefined>();
      });

      it("should type the meta as required", () => {
        expectTypeOf(successResult.meta).toEqualTypeOf<QMeta>();
      });
    });
    describe("When  dereferencing the result", () => {
      const arbitraryResult = new QResult({
        data: [{ name: "Seb" }],
        meta: new QMeta({
          spans: initialSqlSpan,
        }),
      }) as QResult<{ name: string }[], QError>;

      it("should remove undefined when known", () => {
        const { data, error } = arbitraryResult;
        if (data) {
          expectTypeOf(data).toEqualTypeOf<
            {
              name: string;
            }[]
          >();
        }
        if (error) {
          expectTypeOf(error).toEqualTypeOf<QError>();
        }
      });
    });
    describe("With a error result", () => {
      const errorResult = new QResult<{ name: string }[], QError>({
        error: {
          message: "error",
          code: "QUERY_FAILED",
        },
        meta: new QMeta({
          spans: initialSqlSpan,
        }),
      });

      it("should type the data as optional", () => {
        expectTypeOf(errorResult.data).toEqualTypeOf<SuccessData | undefined>();
      });

      it("should type the error as optional", () => {
        expectTypeOf(errorResult.error).toEqualTypeOf<QError | undefined>();
      });

      it("should type the meta as required", () => {
        expectTypeOf(errorResult.meta).toEqualTypeOf<QMeta>();
      });
    });
  });

  describe("toJsonifiable", () => {
    describe("when a result is success", () => {
      it("should return a jsonifiable success paybload", () => {
        const result = createSuccessResult();
        const jsonifiable = result.toJsonifiable();
        expect(jsonifiable).toStrictEqual({
          data: [{ name: "Sébastien" }],
          meta: {
            spans: [initialSqlSpan],
          },
        });
        expectTypeOf(jsonifiable).toEqualTypeOf<{
          data?: { name: string }[] | undefined;
          error?: QError;
          meta: QMetaJsonifiable;
        }>();
      });
    });
    describe("when a result is an error", () => {
      it("should return a jsonifiable error payload", () => {
        const result = createErrorResult();
        const jsonifiable = result.toJsonifiable();
        expect(jsonifiable).toStrictEqual({
          error: {
            message: "An error occurred",
            code: "QUERY_FAILED",
          },
          meta: {
            spans: [initialSqlSpan],
          },
        });
        expectTypeOf(jsonifiable).toEqualTypeOf<{
          data?: { name: string }[] | undefined;
          error?: QError;
          meta: QMetaJsonifiable;
        }>();
      });

      it("should leave the error cause out", () => {
        const result = new QResult<undefined, QError>({
          error: {
            message: "An error occurred",
            code: "QUERY_FAILED",
            cause: new Error("Driver error"),
          },
        });
        const jsonifiable = result.toJsonifiable();
        expect(jsonifiable.error).toStrictEqual({
          message: "An error occurred",
          code: "QUERY_FAILED",
        });
        // The original error isn't altered
        expect(result.error?.cause).toBeInstanceOf(Error);
      });
    });
  });

  describe("getOrThrow", () => {
    it("should return the result value if a success", () => {
      const successResult = createSuccessResult();
      const value = successResult.getOrThrow();
      expect(value).toStrictEqual(successData);
      expectTypeOf(value).toEqualTypeOf<SuccessData>();
    });

    it("should throw a QErrors.QueryFailed on query failure", () => {
      const cause = new Error("Driver error");
      const errorResult = new QResult<undefined, QError>({
        error: { message: "errorMessage", code: "QUERY_FAILED", cause },
      });
      expect(() => errorResult.getOrThrow()).toThrow(QErrors.QueryFailed);
      expect(() => errorResult.getOrThrow()).toThrow(
        expect.objectContaining({
          message: "Query failed: errorMessage",
          code: "QUERY_FAILED",
          statusCode: 500,
          cause,
        })
      );
    });

    it("should throw a QErrors.Aborted when aborted", () => {
      const timeout = new DOMException("timed out", "TimeoutError");
      const timedOut = new QResult<undefined, QError>({
        error: { message: "timed out", code: "ABORTED", cause: timeout },
      });
      expect(() => timedOut.getOrThrow()).toThrow(
        expect.objectContaining({
          message: "Query aborted: timed out",
          code: "ABORTED",
          statusCode: 504,
          cause: timeout,
        })
      );
      const reason = new DOMException("aborted", "AbortError");
      const aborted = new QResult<undefined, QError>({
        error: { message: "aborted", code: "ABORTED", cause: reason },
      });
      expect(() => aborted.getOrThrow()).toThrow(QErrors.Aborted);
      expect(() => aborted.getOrThrow()).toThrow(
        expect.objectContaining({ statusCode: 499, cause: reason })
      );
    });

    it("should throw the QErrors.TooManyResults cause itself", () => {
      const cause = new QErrors.TooManyResults(2);
      const result = new QResult<undefined, QError>({
        error: { message: cause.message, code: "TOO_MANY_RESULTS", cause },
      });
      expect(() => result.getOrThrow()).toThrow(cause);
    });

    it("should throw an Error with the cause when the mapper failed", () => {
      const result = createErrorResult("x").map(() => {
        return {};
      });
      const cause = new Error("mapper bug");
      const mapFailed = createSuccessResult().map(() => {
        throw cause;
      });
      expect(mapFailed.error).toMatchObject({ code: "MAP_FAILED", cause });
      expect(() => mapFailed.getOrThrow()).toThrow(
        expect.objectContaining({ message: "mapper bug", cause })
      );
      expect(() => mapFailed.getOrThrow()).not.toThrow(QErrors.QueryFailed);
      expect(result.error?.code).toBe("QUERY_FAILED");
    });

    it("should throw custom error if a failure", () => {
      const errorResult = createErrorResult("qErrMsg");
      expect(() =>
        errorResult.getOrThrow(
          (qErr) => new EvalError(`${qErr.message} & custom`)
        )
      ).toThrow(new EvalError(`qErrMsg & custom`));
    });

    describe("with error factories", () => {
      const tooManyCause = new QErrors.TooManyResults(3);
      const createTooManyResult = () =>
        new QResult<undefined, QError>({
          error: {
            message: tooManyCause.message,
            code: "TOO_MANY_RESULTS",
            cause: tooManyCause,
          },
          meta: new QMeta({ name: "getOne" }),
        });

      it("should throw the onError error with the default error and the QError", () => {
        const errorResult = createErrorResult("qErrMsg");
        const onError = vi.fn<QErrorFactory>(
          ({ error }) => new EvalError("custom", { cause: error })
        );
        expect(() => errorResult.getOrThrow({ onError })).toThrow(
          expect.objectContaining({
            name: "EvalError",
            message: "custom",
            cause: expect.any(QErrors.QueryFailed),
          })
        );
        expect(onError).toHaveBeenCalledExactlyOnceWith({
          error: expect.any(QErrors.QueryFailed),
          qError: errorResult.error,
          meta: errorResult.meta,
        });
      });

      it("should throw the onTooManyResults error with the row count", () => {
        const result = createTooManyResult();
        const onError = vi.fn<QErrorFactory>(() => new Error("onError"));
        const onTooManyResults = vi.fn<QTooManyResultsErrorFactory>(
          ({ rowCount }) => new RangeError(`got ${rowCount}`)
        );
        expect(() => result.getOrThrow({ onError, onTooManyResults })).toThrow(
          new RangeError("got 3")
        );
        expect(onTooManyResults).toHaveBeenCalledExactlyOnceWith({
          error: tooManyCause,
          rowCount: 3,
          meta: result.meta,
        });
        expect(onError).not.toHaveBeenCalled();
      });

      it("should not use onError for too many results", () => {
        const onError = vi.fn<QErrorFactory>(() => new Error("onError"));
        expect(() => createTooManyResult().getOrThrow({ onError })).toThrow(
          tooManyCause
        );
        expect(onError).not.toHaveBeenCalled();
      });

      it("should throw the default errors without factories", () => {
        expect(() => createErrorResult().getOrThrow({})).toThrow(
          QErrors.QueryFailed
        );
        // onTooManyResults only applies to too many results
        expect(() =>
          createErrorResult().getOrThrow({
            onTooManyResults: () => new Error("unexpected"),
          })
        ).toThrow(QErrors.QueryFailed);
        expect(() =>
          createTooManyResult().getOrThrow({ onError: undefined })
        ).toThrow(tooManyCause);
      });

      it("should return the data on success", () => {
        const onError = vi.fn<QErrorFactory>(() => new Error("onError"));
        expect(createSuccessResult().getOrThrow({ onError })).toStrictEqual(
          successData
        );
        expect(onError).not.toHaveBeenCalled();
      });
    });
  });

  describe("map", () => {
    describe("when a result is success", () => {
      const successResult = createSuccessResult();

      it("should keep custom spans, even when they are not structured cloneable", () => {
        const result = new QResult({
          data: successData,
          meta: new QMeta({
            spans: [
              initialSqlSpan,
              {
                type: "materialization",
                timeMs: 5,
                affectedRows: 1,
                helper: () => "not cloneable",
              } as QMetaSpan,
            ],
          }),
        });
        const mapped = result.map((row) => {
          return { name: row.name };
        });
        expect(mapped.meta.getSpans().map((span) => span.type)).toStrictEqual([
          "sql",
          "materialization",
          "map",
        ]);
        expect(
          mapped.meta.getSpansByType("materialization")[0]?.affectedRows
        ).toBe(1);
      });

      it("should apply transformation with updated metadata", () => {
        const mappedResult = successResult.map((row) => {
          vi.advanceTimersByTime(1000);
          return {
            name: row.name.length,
            capitalized: row.name.toUpperCase(),
          };
        });

        expectTypeOf(mappedResult).toEqualTypeOf<
          QResult<{ name: number; capitalized: string }[], QError | undefined>
        >();

        expect(mappedResult.isOk()).toBe(true);
        const { meta, data } = mappedResult;
        expect(meta.getSpans()).toHaveLength(2);
        expect(meta.getLatestSpan()?.type).toBe("map");
        expect(meta.getLatestSpan()?.timeMs).toBeGreaterThanOrEqual(1000);
        expect(meta.getTotalTimeMs()).toBeGreaterThan(initialSqlSpan.timeMs);
        expect(data).toStrictEqual([
          {
            capitalized: "SÉBASTIEN",
            name: 9,
          },
        ]);
        expectTypeOf(meta).toEqualTypeOf<QMeta>();
        expectTypeOf(data).toEqualTypeOf<
          | {
              name: number;
              capitalized: string;
            }[]
          | undefined
        >();
      });
    });

    it("should return an error when the transform function throws", () => {
      const successResult = createSuccessResult();
      const thrown = new Error("Hello");
      const mappedResult = successResult.map((_data) => {
        vi.advanceTimersByTime(10);
        throw thrown;
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message: "Hello",
        code: "MAP_FAILED",
        cause: thrown,
      });
      const span = mappedResult.meta.getLatestSpan();
      expect(span?.type).toBe("map");
      expect(span?.timeMs).toBeGreaterThanOrEqual(10);
    });

    it("should return an error when the transform function throws a string", () => {
      const mappedResult = createSuccessResult().map((_data) => {
        // oxlint-disable-next-line no-throw-literal, typescript/only-throw-error
        throw "Hello string";
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message: "Hello string",
        code: "MAP_FAILED",
        cause: "Hello string",
      });
    });

    // Some libraries (ie: tedious) might throw an array of errors
    it("should return an error with a fallback message when the transform function throws an array", () => {
      const mappedResult = createSuccessResult().map((_data) => {
        // oxlint-disable-next-line no-throw-literal, typescript/only-throw-error
        throw [new Error("first"), new Error("second")];
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message: "mapper: unknown error",
        code: "MAP_FAILED",
        cause: [new Error("first"), new Error("second")],
      });
      expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
    });

    it("should return an error when a success result has undefined data", () => {
      const mappedResult = new QResult<{ id: number }[] | undefined, QError>(
        {}
      ).map((row) => {
        return { id: row.id };
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message:
          "QResult.map(): expected data to be an array of rows, received undefined",
        code: "MAP_FAILED",
        cause: expect.any(TypeError),
      });
      expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
    });

    it("should return an error when a success result has null data (untyped runtime)", () => {
      const mappedResult = new QResult<{ id: number }[], QError>({
        data: null as unknown as { id: number }[],
      }).map((row) => {
        return { id: row.id };
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message:
          "QResult.map(): expected data to be an array of rows, received null",
        code: "MAP_FAILED",
        cause: expect.any(TypeError),
      });
      expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
    });

    describe("with a single row result", () => {
      type Row = { id: number };

      it("should map the row", () => {
        const mappedResult = new QResult<Row | null, QError>({
          data: { id: 1 },
        }).map((row) => {
          return { key: `key-${row.id}` };
        });
        expect(mappedResult.isOk()).toBe(true);
        expect(mappedResult.data).toStrictEqual({ key: "key-1" });
        expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
        expectTypeOf(mappedResult.data).toEqualTypeOf<
          { key: string } | null | undefined
        >();
      });

      it("should keep null without calling the transform", () => {
        const transformFn = vi.fn<(row: Row) => { key: string }>();
        const mappedResult = new QResult<Row | null, QError>({
          data: null,
          shape: "one",
        }).map(transformFn);
        expect(mappedResult.isOk()).toBe(true);
        expect(mappedResult.data).toBeNull();
        expect(transformFn).not.toHaveBeenCalled();
      });

      it("should keep the shape when chaining", () => {
        const mappedResult = new QResult<Row | null, QError>({
          data: null,
          shape: "one",
        })
          .map((row) => {
            return { id: row.id + 1 };
          })
          .map((row) => {
            return { id: row.id + 1 };
          });
        expect(mappedResult.data).toBeNull();
      });

      it("should return an error when the transform throws", () => {
        const mappedResult = new QResult<Row | null, QError>({
          data: { id: 1 },
        }).map(() => {
          throw new Error("failed");
        });
        expect(mappedResult.error).toStrictEqual({
          message: "failed",
          code: "MAP_FAILED",
          cause: expect.any(Error),
        });
      });

      it("should be serializable", () => {
        const result = new QResult<Row | null, QError>({
          data: null,
          shape: "one",
        });
        expect(result.toJsonifiable().data).toBeNull();
        expect(result.getOrThrow()).toBeNull();
        expectTypeOf(result.getOrThrow()).toEqualTypeOf<Row | null>();
      });
    });

    it("should map an empty result to an empty array", () => {
      const mappedResult = new QResult<{ id: number }[], QError>({
        data: [],
      }).map((row) => {
        return { id: row.id };
      });
      expect(mappedResult.isOk()).toBe(true);
      expect(mappedResult.data).toStrictEqual([]);
    });

    it("should be chainable", () => {
      const successResult = createSuccessResult();
      const mappedResult = successResult
        .map((row) => {
          return { ...row, first: true };
        })
        .map((row) => {
          return { ...row, second: true };
        });
      expect(mappedResult.data).toStrictEqual(
        successData.map((row) => {
          return { ...row, first: true, second: true };
        })
      );
    });
  });
});
