import { describe, expect, it, vi } from "vitest";

import { brandKey } from "../utils/brand";
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
  return await import("../index");
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
        });
        expect(tooMany).toBeInstanceOf(QTooManyResultsError);
        expect(tooMany).toBeInstanceOf(Error);
        expect(tooMany).not.toBeInstanceOf(QNoResultError);
        expect(tooMany).toMatchObject({
          name: "QTooManyResultsError",
          code: "TOO_MANY_RESULTS",
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
