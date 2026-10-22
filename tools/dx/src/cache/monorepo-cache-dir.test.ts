import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  findMonorepoRoot,
  getGlobalCacheDir,
  getMonorepoCacheDir,
  isCacheDisabled,
} from "./monorepo-cache-dir.ts";

describe("getMonorepoCacheDir", () => {
  let root = "";
  let packageDir = "";

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "dx-cache-"));
    writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n");
    packageDir = path.join(root, "packages", "pkg");
    mkdirSync(packageDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the missing cache directory of the package", () => {
    expect(existsSync(path.join(root, ".cache"))).toBe(false);
    const cacheDir = getMonorepoCacheDir("vitest", packageDir, {});
    expect(cacheDir).toBe(
      path.join(root, ".cache", "vitest", "packages", "pkg")
    );
    expect(existsSync(cacheDir ?? "")).toBe(true);
  });

  it("keeps an existing cache directory", () => {
    const first = getMonorepoCacheDir("typescript", packageDir, {}) ?? "";
    writeFileSync(path.join(first, "tsconfig.tsbuildinfo"), "{}");
    expect(getMonorepoCacheDir("typescript", packageDir, {})).toBe(first);
    expect(existsSync(path.join(first, "tsconfig.tsbuildinfo"))).toBe(true);
  });

  it("returns undefined outside the monorepo", () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), "dx-outside-"));
    try {
      expect(findMonorepoRoot(outside)).toBeUndefined();
      expect(getMonorepoCacheDir("vitest", outside, {})).toBeUndefined();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  describe("DX_BASE_CACHE_DIR", () => {
    let baseDir = "";

    beforeEach(() => {
      baseDir = mkdtempSync(path.join(os.tmpdir(), "dx-base-"));
    });

    afterEach(() => {
      rmSync(baseDir, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it("writes the cache in the .cache subdirectory of an existing directory", () => {
      const env = { DX_BASE_CACHE_DIR: baseDir };
      expect(getGlobalCacheDir(root, env)).toBe(path.join(baseDir, ".cache"));
      const cacheDir = getMonorepoCacheDir("vitest", packageDir, env);
      expect(cacheDir).toBe(
        path.join(baseDir, ".cache", "vitest", "packages", "pkg")
      );
      expect(existsSync(cacheDir ?? "")).toBe(true);
      expect(existsSync(path.join(root, ".cache"))).toBe(false);
    });

    it("falls back to the monorepo root when the directory doesn't exist", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const env = { DX_BASE_CACHE_DIR: path.join(baseDir, "missing") };
      expect(getGlobalCacheDir(root, env)).toBe(path.join(root, ".cache"));
      expect(warn).toHaveBeenCalledOnce();
    });

    it("falls back to the monorepo root when the path is a file", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const file = path.join(baseDir, "file");
      writeFileSync(file, "");
      expect(getGlobalCacheDir(root, { DX_BASE_CACHE_DIR: file })).toBe(
        path.join(root, ".cache")
      );
    });

    it("ignores an empty value", () => {
      expect(getGlobalCacheDir(root, { DX_BASE_CACHE_DIR: "" })).toBe(
        path.join(root, ".cache")
      );
    });
  });

  it.each([
    [undefined, false],
    ["", false],
    ["0", false],
    ["false", false],
    ["1", true],
    ["true", true],
    ["TRUE", true],
  ])("DX_DISABLE_CACHE=%s disables the cache: %s", (value, expected) => {
    const env = value === undefined ? {} : { DX_DISABLE_CACHE: value };
    expect(isCacheDisabled(env)).toBe(expected);
  });
});
