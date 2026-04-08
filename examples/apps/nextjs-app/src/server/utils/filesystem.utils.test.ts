import fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAndEnsureWritableDirectory,
  createDirectory,
} from './filesystem.utils';

vi.mock('node:fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
    accessSync: vi.fn(),
    constants: {
      W_OK: 2,
    },
  },
}));

describe('filesystem.utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDirectory', () => {
    it('should create a directory recursively', () => {
      createDirectory('/some/path');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/some/path', {
        recursive: true,
      });
    });

    it('should not throw if the directory already exists', () => {
      const error = new Error('EEXIST') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => createDirectory('/some/path')).not.toThrow();
    });

    it('should throw if another error occurs during creation', () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => createDirectory('/some/path')).toThrow(error);
    });
  });

  describe('createOrEnsureWritableDirectory', () => {
    it('should return if path is undefined', () => {
      expect(
        createAndEnsureWritableDirectory('label', undefined)
      ).toBeUndefined();
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should create the directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);

      createAndEnsureWritableDirectory('test-dir', '/new/path');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/new/path', {
        recursive: true,
      });
    });

    it('should throw if directory creation fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const error = new Error('Permission denied');
      vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
        throw error;
      });

      expect(() =>
        createAndEnsureWritableDirectory('test-dir', '/new/path')
      ).toThrow("Failed to create test-dir '/new/path' - Permission denied");
    });

    it('should throw if path exists but is not a directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);

      expect(() =>
        createAndEnsureWritableDirectory('test-dir', '/existing/file')
      ).toThrow("test-dir '/existing/file' must be a directory");
    });

    it('should throw if directory is not writable', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.accessSync).mockImplementationOnce(() => {
        throw new Error('Not writable');
      });

      expect(() =>
        createAndEnsureWritableDirectory('test-dir', '/readonly/dir')
      ).toThrow("test-dir '/readonly/dir' must be writable");
    });

    it('should succeed if directory exists and is writable', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);

      expect(() =>
        createAndEnsureWritableDirectory('test-dir', '/ok/dir')
      ).not.toThrow();
      expect(fs.accessSync).toHaveBeenCalledWith('/ok/dir', 2);
    });
  });
});
