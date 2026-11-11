import { describe, expectTypeOf, it } from "vitest";
import * as z from "zod";

import { duckMeta } from "./zod-duckdb-meta.ts";
import type { DuckdbZodMeta } from "./zod-duckdb-meta.ts";

describe("zod duckdb meta typing", () => {
  it("should accept supported values", () => {
    z.string().meta({ duckdbCollate: "NOCASE" });
    z.string().meta({ duckdbCollate: "NOCASE.NOACCENT" });
    z.string().meta({ duckdbCollate: "en_US" });
    z.number().meta({ duckdbType: "DECIMAL(10,2)" });
    expectTypeOf<DuckdbZodMeta["duckdbType"]>().not.toBeAny();
  });

  it("should reject unsupported values", () => {
    // @ts-expect-error unknown duckdb type
    z.string().meta({ duckdbType: "NOT_A_TYPE" });
    // @ts-expect-error not a collation name
    z.string().meta({ duckdbCollate: "NO CASE" });
    // @ts-expect-error wrong value type
    z.string().meta({ duckdbCollate: 1 });
    // @ts-expect-error wrong value type
    z.string().meta({ primaryKey: "yes" });
  });

  describe("duckMeta", () => {
    it("should accept valid meta and return it unchanged", () => {
      const meta = duckMeta({ duckdbCollate: "NOCASE", primaryKey: true });
      expectTypeOf(meta.duckdbCollate).toEqualTypeOf<"NOCASE">();
      z.string().meta(duckMeta({ duckdbType: "VARCHAR", duckdbCollate: "fr" }));
      z.number().meta(duckMeta({ duckdbType: "DECIMAL(10,2)" }));
    });

    it("should reject unknown keys and invalid values", () => {
      // @ts-expect-error typo in the key
      duckMeta({ duckdbColate: "NOCASE" });
      // @ts-expect-error unknown duckdb type
      duckMeta({ duckdbType: "NOT_A_TYPE" });
      // @ts-expect-error invalid collation
      duckMeta({ duckdbCollate: "NO CASE" });
    });

    it("should only allow duckdbCollate on VARCHAR", () => {
      // @ts-expect-error UUID can't be collated
      duckMeta({ duckdbType: "UUID", duckdbCollate: "NOCASE" });
      // @ts-expect-error arrays can't be collated
      duckMeta({ duckdbType: "VARCHAR[]", duckdbCollate: "NOCASE" });
      // @ts-expect-error DECIMAL can't be collated
      duckMeta({ duckdbType: "DECIMAL(10,2)", duckdbCollate: "NOCASE" });
    });
  });
});
