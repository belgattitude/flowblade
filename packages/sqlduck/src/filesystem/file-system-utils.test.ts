import { fileURLToPath } from 'node:url';

import { describe, expect } from 'vitest';

import { FileSystemUtils } from './file-system-utils.ts';

describe('FileSystemUtils', () => {
  describe('isSamePath', () => {
    const fsUtils = new FileSystemUtils();
    const currentFile = fileURLToPath(import.meta.url);
    const cwd = process.cwd();
    const relative = currentFile.replace(cwd, './');

    expect(fsUtils.isSamePath(currentFile, currentFile)).toStrictEqual(true);
    expect(fsUtils.isSamePath(relative, currentFile)).toStrictEqual(true);
    expect(fsUtils.isSamePath('/', currentFile)).toStrictEqual(false);
  });
});
