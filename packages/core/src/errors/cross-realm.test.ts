import { describe, expect, it, vi } from "vitest";

import { QMeta } from "../meta/q-meta";
import { QResult } from "../query-result/q-result";
import type { QError } from "../query-result/types";
import { brandKey } from "../utils/brand";
import {
  createQResultSuccess,
  getOneRowOrThrow,
  toOneRowQResult,
} from "../utils/datasource.factories";
import type { QTooManyResultsErrorFactory } from "./q-error-factories";
import { QNoResultError } from "./q-no-result-error";
import { QTooManyResultsError } from "./q-too-many-results-error";

// not available in browsers and cloudflare workerd
const runInNewContext = await import("node:vm")
  .then((mod) => mod.runInNewContext)
  .catch(() => undefined);

/**
 * Load another copy of core (ie: esm + cjs builds, or 2 installs of the same major)
 */
const importOtherCopy = async () => {
  vi.resetModules();
  return {
    ...(await import("../index")),
    ...(await import("../datasource/index")),
  };
};

describe("Cross-realm specs", () => {
  describe.skipIf(typeof runInNewContext !== "function")(
    "node:vm runInNewContext",
    () => {
      it("should support instanceof when created in a new context", () => {
        const sandbox = {
          QNoResultError,
          QTooManyResultsError,
          noResult: null as unknown,
          tooMany: null as unknown,
        };
        runInNewContext!(
          `noResult = new QNoResultError(); tooMany = new QTooManyResultsError(3)`,
          sandbox
        );
        const { noResult, tooMany } = sandbox;
        expect(noResult).toBeInstanceOf(QNoResultError);
        expect(noResult).toBeInstanceOf(Error);
        expect(noResult).not.toBeInstanceOf(QTooManyResultsError);
        expect(noResult).toMatchObject({
          name: "QNoResultError",
          code: "NO_RESULT",
          statusCode: 404,
        });
        expect(tooMany).toBeInstanceOf(QTooManyResultsError);
        expect(tooMany).toBeInstanceOf(Error);
        expect(tooMany).not.toBeInstanceOf(QNoResultError);
        expect(tooMany).toMatchObject({
          name: "QTooManyResultsError",
          code: "TOO_MANY_RESULTS",
          statusCode: 500,
          rowCount: 3,
        });
      });

      it("should support instanceof when thrown from a new context", () => {
        let caught: unknown;
        try {
          runInNewContext!(`throw new QNoResultError()`, { QNoResultError });
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(QNoResultError);
        expect(caught).toBeInstanceOf(Error);
      });

      it("should support instanceof for errors created with the new context Error", () => {
        // ie: another copy of core evaluated in the vm, its errors extend the vm Error
        const createInVm = (brands: string[], props: Record<string, unknown>) =>
          runInNewContext!(
            `const e = new Error(message);
             Object.assign(e, props);
             Object.defineProperty(e, Symbol.for(brandName), { value: brands });
             e`,
            {
              brandName: Symbol.keyFor(brandKey),
              brands,
              message: "From vm",
              props,
            }
          ) as unknown;

        const noResult = createInVm(["QNoResultError"], { code: "NO_RESULT" });
        expect(noResult).toBeInstanceOf(QNoResultError);
        expect(noResult).not.toBeInstanceOf(QTooManyResultsError);
        // native behavior: the vm Error is a distinct constructor
        expect(noResult).not.toBeInstanceOf(Error);

        const tooMany = createInVm(["QTooManyResultsError"], {
          code: "TOO_MANY_RESULTS",
          rowCount: 2,
        });
        expect(tooMany).toBeInstanceOf(QTooManyResultsError);
        expect(tooMany).not.toBeInstanceOf(QNoResultError);

        // brand hardening still applies across realms
        expect(createInVm(["QNoResultError"], {})).not.toBeInstanceOf(
          QNoResultError
        );
        expect(
          runInNewContext!(
            `const o = { code: "NO_RESULT" };
             Object.defineProperty(o, Symbol.for(brandName), { value: ["QNoResultError"] });
             o`,
            { brandName: Symbol.keyFor(brandKey) }
          )
        ).not.toBeInstanceOf(QNoResultError);
      });

      it("should apply the onTooManyResults factory to a cause from a new context", () => {
        const cause = runInNewContext!(
          `const e = new Error("Expected exactly one row, received 2");
           Object.assign(e, { code: "TOO_MANY_RESULTS", statusCode: 500, rowCount: 2 });
           Object.defineProperty(e, Symbol.for(brandName), { value: ["QTooManyResultsError"] });
           e`,
          { brandName: Symbol.keyFor(brandKey) }
        ) as Error;
        const result = new QResult<{ id: number } | null, QError>({
          meta: new QMeta({ name: "test" }),
          error: { message: cause.message, code: "TOO_MANY_RESULTS", cause },
          shape: "one",
        });
        const onTooManyResults = vi.fn<QTooManyResultsErrorFactory>(
          ({ rowCount }) => new Error(`custom got ${rowCount}`)
        );
        expect(() => getOneRowOrThrow(result, { onTooManyResults })).toThrow(
          "custom got 2"
        );
        expect(onTooManyResults).toHaveBeenCalledWith(
          expect.objectContaining({ error: cause, rowCount: 2 })
        );
        // the defaults (ie: datasource defaultOptions) apply too
        expect(() =>
          getOneRowOrThrow(result, undefined, { onTooManyResults })
        ).toThrow("custom got 2");
        // without factory, the vm error is thrown as is
        expect(() => getOneRowOrThrow(result)).toThrow(cause);
      });

      it("should handle rows created in a new context", () => {
        const meta = new QMeta({ name: "test" });
        const fromVm = (code: string) =>
          runInNewContext!(code) as { id: number }[];

        // Array.isArray works across realms, unlike instanceof Array
        const oneRow = fromVm(`[{ id: 1 }]`);
        expect(oneRow).not.toBeInstanceOf(Array);
        const one = toOneRowQResult(createQResultSuccess(oneRow, meta));
        expect(one.data).toStrictEqual(oneRow[0]);
        expect(
          one.map((row) => {
            return { value: row.id };
          }).data
        ).toStrictEqual({
          value: 1,
        });
        expect(getOneRowOrThrow(one)).toBe(oneRow[0]);

        const none = toOneRowQResult(createQResultSuccess(fromVm(`[]`), meta));
        expect(none.data).toBeNull();
        expect(() => getOneRowOrThrow(none)).toThrow(QNoResultError);
        expect(getOneRowOrThrow(none, { defaultValue: "default" })).toBe(
          "default"
        );

        const many = toOneRowQResult(
          createQResultSuccess(fromVm(`[{ id: 1 }, { id: 2 }]`), meta)
        );
        expect(many.error?.cause).toBeInstanceOf(QTooManyResultsError);
        expect(() => getOneRowOrThrow(many)).toThrow(QTooManyResultsError);

        // shape inference: a vm array holds rows, a vm object is a single row
        const rows = new QResult({ data: fromVm(`[{ id: 1 }, { id: 2 }]`) });
        // mapped with the vm Array.prototype.map: copied to compare the values,
        // toStrictEqual also compares the (realm) prototypes
        expect([
          ...(rows.map((row) => {
            return { value: row.id };
          }).data ?? []),
        ]).toStrictEqual([{ value: 1 }, { value: 2 }]);
        const single = new QResult({
          data: runInNewContext!(`({ id: 3 })`) as { id: number },
        });
        expect(
          single.map((row) => {
            return { value: row.id };
          }).data
        ).toStrictEqual({
          value: 3,
        });
      });
    }
  );

  describe("Multiple copies of the same major version", () => {
    it("should load a distinct copy", async () => {
      const other = await importOtherCopy();
      expect(other.QErrors.NoResult).not.toBe(QNoResultError);
      expect(other.QErrors.TooManyResults).not.toBe(QTooManyResultsError);
    });

    it("should support instanceof across copies", async () => {
      const other = await importOtherCopy();
      const noResult = new other.QErrors.NoResult();
      expect(noResult).toBeInstanceOf(QNoResultError);
      expect(noResult).toBeInstanceOf(Error);
      expect(noResult).not.toBeInstanceOf(QTooManyResultsError);

      const tooMany = new other.QErrors.TooManyResults(2);
      expect(tooMany).toBeInstanceOf(QTooManyResultsError);
      expect(tooMany).not.toBeInstanceOf(QNoResultError);

      // the other way around
      expect(new QNoResultError()).toBeInstanceOf(other.QErrors.NoResult);
      expect(new QTooManyResultsError(2)).toBeInstanceOf(
        other.QErrors.TooManyResults
      );
    });

    it("should recognize errors created by toOneRowQResult in another copy", async () => {
      const other = await importOtherCopy();
      const { error } = other.toOneRowQResult(
        other.createQResultSuccess(
          [{ id: 1 }, { id: 2 }],
          new other.QMeta({ name: "test" })
        )
      );
      expect(error?.cause).toBeInstanceOf(QTooManyResultsError);
    });

    it("should recognize errors thrown by getOneRowOrThrow in another copy", async () => {
      const other = await importOtherCopy();
      const noRow = other.toOneRowQResult(
        other.createQResultSuccess([], new other.QMeta({ name: "test" }))
      );
      expect(() => other.getOneRowOrThrow(noRow)).toThrow(QNoResultError);
    });

    it("should keep statusCode across copies", async () => {
      const other = await importOtherCopy();
      const noResult = new other.QErrors.NoResult();
      expect(noResult).toBeInstanceOf(QNoResultError);
      expect(noResult).toMatchObject({ statusCode: 404 });
      const tooMany = new other.QErrors.TooManyResults(2);
      expect(tooMany).toBeInstanceOf(QTooManyResultsError);
      expect(tooMany).toMatchObject({ statusCode: 500, rowCount: 2 });
    });

    it("should apply the factories to results created by another copy", async () => {
      const other = await importOtherCopy();
      const meta = new other.QMeta({ name: "test" });
      const many = other.toOneRowQResult(
        other.createQResultSuccess([{ id: 1 }, { id: 2 }], meta)
      );
      const onTooManyResults = vi.fn<QTooManyResultsErrorFactory>(
        ({ rowCount }) => new Error(`custom got ${rowCount}`)
      );
      expect(() => getOneRowOrThrow(many, { onTooManyResults })).toThrow(
        "custom got 2"
      );
      expect(onTooManyResults).toHaveBeenCalledOnce();

      // and the other way around, with datasource defaults
      const manyHere = toOneRowQResult(
        createQResultSuccess([{ id: 1 }, { id: 2 }], new QMeta({ name: "t" }))
      );
      expect(() =>
        other.getOneRowOrThrow(manyHere, undefined, { onTooManyResults })
      ).toThrow("custom got 2");
    });
  });

  describe("Different major versions", () => {
    it("should not match errors branded with another major version", () => {
      const fromOtherMajor = Object.defineProperty(
        Object.assign(new Error("From other major"), { code: "NO_RESULT" }),
        Symbol.for("@flowblade/core-v999999"),
        { value: ["QNoResultError"] }
      );
      expect(fromOtherMajor).not.toBeInstanceOf(QNoResultError);
    });
  });
});
