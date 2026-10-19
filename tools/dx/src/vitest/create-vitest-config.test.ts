import { describe, expect, it } from "vitest";

import { createVitestConfig } from "./create-vitest-config.ts";

describe("createVitestConfig", () => {
  it("returns the dx base without config", () => {
    const config = createVitestConfig({}, { cache: false });
    expect(config.test?.environment).toBe("node");
    expect(config.test?.coverage).toMatchObject({
      provider: "v8",
      reporter: ["text"],
    });
  });

  it("merges the config over the dx base", () => {
    const config = createVitestConfig(
      {
        test: {
          include: ["./src/**/*.test.ts"],
          environment: "happy-dom",
          exclude: ["**/.next/**"],
          coverage: { reporter: ["clover"] },
        },
      },
      { cache: false }
    );
    expect(config.test?.include).toStrictEqual(["./src/**/*.test.ts"]);
    expect(config.test?.environment).toBe("happy-dom");
    // Arrays are concatenated
    expect(config.test?.exclude).toContain("**/node_modules/**");
    expect(config.test?.exclude).toContain("**/.next/**");
    expect(config.test?.coverage).toMatchObject({
      provider: "v8",
      reporter: ["text", "clover"],
    });
  });

  it("applies the options to the dx base", () => {
    const config = createVitestConfig({}, { react: true, cache: false });
    expect(config.test?.environment).toBe("happy-dom");
    expect(config.plugins?.length).toBeGreaterThan(0);
  });
});
