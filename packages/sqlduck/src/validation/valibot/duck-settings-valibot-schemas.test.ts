import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { duckValidatorsValibot } from "./duck-validators-valibot.ts";

const validMemoryLimits = [
  "512MB",
  "2GB",
  "2.7GB",
  "2.7 GB",
  "2gb",
  "500KB",
  "1.5TB",
  "4GiB",
  "512MiB",
  "80%",
  "12.5%",
];
const invalidMemoryLimits = [
  "",
  "2",
  "2G",
  "abc",
  "2.GB",
  ".5GB",
  "-1",
  "1e3MB",
  "2PB",
  "2 GB ",
];

describe("duckValidatorsValibot.memoryLimit", () => {
  it.each(validMemoryLimits)("accepts %j", (value) => {
    expect(v.safeParse(duckValidatorsValibot.memoryLimit, value).success).toBe(
      true
    );
  });

  it.each(invalidMemoryLimits)("rejects %j", (value) => {
    expect(v.safeParse(duckValidatorsValibot.memoryLimit, value).success).toBe(
      false
    );
  });
});

describe("duckValidatorsValibot.threads", () => {
  it.each(["1", "4", "16"])("accepts %j", (value) => {
    expect(v.safeParse(duckValidatorsValibot.threads, value).success).toBe(
      true
    );
  });

  it.each(["", "0", "-1", "1.5", "04", "four"])("rejects %j", (value) => {
    expect(v.safeParse(duckValidatorsValibot.threads, value).success).toBe(
      false
    );
  });
});
