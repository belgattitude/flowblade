import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect } from "vitest";

import { FileSystemUtils } from "./file-system-utils.ts";

describe("FileSystemUtils", () => {
  describe("isSamePath", () => {
    const fsUtils = new FileSystemUtils();
    const cwd = process.cwd();
    const currentFile = fsUtils.join({
      dirname: `${cwd}/test`,
      filename: "test-filesystem-utils.txt",
    });
    const relative = path.relative(cwd, currentFile);

    it("should return equality for smae paths", () => {
      expect(fsUtils.isSamePath(currentFile, currentFile)).toStrictEqual(true);
      expect(fsUtils.isSamePath(relative, currentFile)).toStrictEqual(true);
      expect(fsUtils.isSamePath("/", currentFile)).toStrictEqual(false);
    });
  });

  describe("isSamePathAndExists", () => {
    const fsUtils = new FileSystemUtils();
    const currentFile = import.meta.filename;
    const cwd = process.cwd();
    const relative = path.relative(cwd, currentFile);

    it("should return equality when same path and exists", () => {
      expect(
        fsUtils.isSamePathAndExists(currentFile, currentFile)
      ).toStrictEqual(true);
      expect(fsUtils.isSamePathAndExists(relative, currentFile)).toStrictEqual(
        true
      );
      expect(fsUtils.isSamePathAndExists("/", currentFile)).toStrictEqual(
        false
      );
    });
  });
  describe("join", () => {
    const fsUtils = new FileSystemUtils();
    const abs = fsUtils.join({
      dirname: "/tmp/../tmp",
      filename: "hello.txt",
    });
    it("should join the path with relative", () => {
      expect(abs).toStrictEqual(path.resolve("/tmp/hello.txt"));
    });
  });
  describe("getFileSize", () => {
    const fsUtils = new FileSystemUtils();
    const currentFile = import.meta.filename;
    it("should return the file size", () => {
      expect(fsUtils.getFileSize(currentFile)).toBeGreaterThan(10);
    });
  });
});
