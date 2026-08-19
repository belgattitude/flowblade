import { describe, expect, it } from "vitest";

import { parseQuerySearchParams } from "./parse-query-search-params";
import type { ExtendedQuerySearchParams } from "./parse-query-search-params";

describe(parseQuerySearchParams, () => {
  it("should omit undefined values", () => {
    const input: ExtendedQuerySearchParams = {
      a: undefined,
      b: "ok",
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "comma-delimited",
    });
    expect(out).toStrictEqual({ b: "ok" });
  });

  it("should concat array values with comma when comma-delimited", () => {
    const input: ExtendedQuerySearchParams = {
      tags: ["a", "b", "c"],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "comma-delimited",
    });
    expect(out).toStrictEqual({ tags: "a,b,c" });
  });

  it("should concat array values with pipe when pipe-delimited", () => {
    const input: ExtendedQuerySearchParams = {
      tags: ["a", "b", "c"],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "pipe-delimited",
    });
    expect(out).toStrictEqual({ tags: "a|b|c" });
  });

  it("should coerce numbers and booleans in arrays to strings before joining", () => {
    const input: ExtendedQuerySearchParams = {
      mixed: [1 as unknown as string, true as unknown as string, "z"],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "comma-delimited",
    });
    expect(out).toStrictEqual({ mixed: "1,true,z" });
  });

  it("should pass through non-array values", () => {
    const input: ExtendedQuerySearchParams = {
      bool: false,
      foo: "bar",
      num: 42,
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "comma-delimited",
    });
    expect(out).toStrictEqual({ bool: false, foo: "bar", num: 42 });
  });

  it("should ignore undefined items inside arrays", () => {
    const input: ExtendedQuerySearchParams = {
      tags: ["a", undefined as unknown as string, "b"],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: "comma-delimited",
    });
    expect(out).toStrictEqual({ tags: "a,b" });
  });
});
