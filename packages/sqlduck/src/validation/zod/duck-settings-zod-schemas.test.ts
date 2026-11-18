import { describe, expect, it } from "vitest";

import { duckValidatorsZod } from "./duck-validators-zod.ts";

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

describe("duckValidatorsZod.memoryLimit", () => {
  it.each(validMemoryLimits)("accepts %j", (value) => {
    expect(duckValidatorsZod.memoryLimit.safeParse(value).success).toBe(true);
  });

  it.each(invalidMemoryLimits)("rejects %j", (value) => {
    expect(duckValidatorsZod.memoryLimit.safeParse(value).success).toBe(false);
  });
});

describe("duckValidatorsZod.threads", () => {
  it.each(["1", "4", "16"])("accepts %j", (value) => {
    expect(duckValidatorsZod.threads.safeParse(value).success).toBe(true);
  });

  it.each(["", "0", "-1", "1.5", "04", "four"])("rejects %j", (value) => {
    expect(duckValidatorsZod.threads.safeParse(value).success).toBe(false);
  });
});
