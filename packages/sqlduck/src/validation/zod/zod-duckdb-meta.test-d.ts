import { describe, expectTypeOf, it } from "vitest";
import * as z from "zod";

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
});
