import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect } from 'vitest';

import { FileSystemUtils } from './file-system-utils.ts';

describe('FileSystemUtils', () => {
  describe('isSamePath', () => {
    const fsUtils = new FileSystemUtils();
    const cwd = process.cwd();
    const currentFile = fsUtils.join({
      dirname: `${cwd}/test`,
      filename: 'test-filesystem-utils.txt',
    });
    const relative = path.relative(cwd, currentFile);

    expect(fsUtils.isSamePath(currentFile, currentFile)).toStrictEqual(true);
    expect(fsUtils.isSamePath(relative, currentFile)).toStrictEqual(true);
    expect(fsUtils.isSamePath('/', currentFile)).toStrictEqual(false);
  });

  describe('isSamePathAndExists', () => {
    const fsUtils = new FileSystemUtils();
    const currentFile = fileURLToPath(import.meta.url);
    const cwd = process.cwd();
    const relative = path.relative(cwd, currentFile);

    expect(fsUtils.isSamePathAndExists(currentFile, currentFile)).toStrictEqual(
      true
    );
    expect(fsUtils.isSamePathAndExists(relative, currentFile)).toStrictEqual(
      true
    );
    expect(fsUtils.isSamePathAndExists('/', currentFile)).toStrictEqual(false);
  });
  describe('join', () => {
    const fsUtils = new FileSystemUtils();
    const abs = fsUtils.join({
      dirname: '/tmp/../tmp',
      filename: 'hello.txt',
    });
    expect(abs).toStrictEqual(path.resolve('/tmp/hello.txt'));
  });
});
