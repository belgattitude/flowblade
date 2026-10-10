import {
  expectTypeOf,
  beforeEach,
  vi,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

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
    });
  });

  describe("getOrThrow", () => {
    it("should return the result value if a success", () => {
      const successResult = createSuccessResult();
      const value = successResult.getOrThrow();
      expect(value).toStrictEqual(successData);
      expectTypeOf(value).toEqualTypeOf<SuccessData>();
    });

    it("should throw the error if a failure", () => {
      const errorResult = createErrorResult("errorMessage");
      expect(() => errorResult.getOrThrow()).toThrow(new Error("errorMessage"));
    });

    it("should throw custom error if a failure", () => {
      const errorResult = createErrorResult("qErrMsg");
      expect(() =>
        errorResult.getOrThrow(
          (qErr) => new EvalError(`${qErr.message} & custom`)
        )
      ).toThrow(new EvalError(`qErrMsg & custom`));
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
          QResult<
            { name: number; capitalized: string }[] | undefined,
            QError | undefined
          >
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
      const mappedResult = successResult.map((_data) => {
        vi.advanceTimersByTime(10);
        throw new Error("Hello");
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message: "Hello",
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
      });
      expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
    });

    it("should return an error when a success result has no rows to map", () => {
      const mappedResult = new QResult<{ id: number }[] | undefined, QError>(
        {}
      ).map((row) => {
        return { id: row.id };
      });
      expect(mappedResult.isError()).toBe(true);
      expect(mappedResult.error).toStrictEqual({
        message: "mapper: no rows to map",
      });
      expect(mappedResult.meta.getLatestSpan()?.type).toBe("map");
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
