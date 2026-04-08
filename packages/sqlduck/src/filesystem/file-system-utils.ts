import fs from 'node:fs';
// eslint-disable-next-line unicorn/import-style
import { basename, dirname } from 'node:path';

import type { Logger } from '@logtape/logtape';

import { sqlduckDefaultLogtapeLogger } from '../logger/sqlduck-default-logtape-logger.ts';

export class FileSystemUtils {
  #logger: Logger;
  constructor(params?: { logger?: Logger }) {
    this.#logger =
      params?.logger ??
      sqlduckDefaultLogtapeLogger.with({
        source: 'FileSystemUtils',
      });
  }
  /**
   * Create a directory recursively if it doesn't exist
   *
   * @throws Error if it can't be created
   */
  createDirectory = (path: string) => {
    try {
      fs.mkdirSync(path, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }
  };
  /**
   * Create a directory recursively if it doesn't exist and ensure it's writable
   */
  createAndEnsureWritableDirectory = (
    label: string,
    path: string | undefined
  ) => {
    if (path === undefined) {
      return;
    }
    if (!fs.existsSync(path)) {
      try {
        this.createDirectory(path);
      } catch (e) {
        throw new Error(
          `Failed to create ${label} '${path}' - ${(e as Error)?.message ?? ''}`
        );
      }
    }
    const stats = fs.statSync(path);
    if (!stats.isDirectory()) {
      throw new Error(`${label} '${path}' must be a directory`);
    }
    try {
      fs.accessSync(path, fs.constants.W_OK);
    } catch {
      throw new Error(`${label} '${path}' must be writable`);
    }
    return;
  };

  /**
   * Check if a path is a regular file and exists
   */
  isFile = (path: string): boolean => {
    try {
      const stats = fs.statSync(path);
      return stats.isFile();
    } catch {
      return false;
    }
  };

  /**
   * Check if a path is a directory and exists
   */
  isDirectory = (path: string): boolean => {
    try {
      const stats = fs.statSync(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  };

  parsePath = (path: string): { directory: string; filename: string } => {
    const dir = dirname(path);
    if (dir.trim() === '') {
      throw new Error(`Invalid path, missing directory '${path}'`);
    }
    const base = basename(path);
    if (base.trim() === '') {
      throw new Error(`Invalid path, missing filename '${path}'`);
    }
    return { directory: dir, filename: base };
  };

  removeFileIfExists = (path: string): boolean => {
    try {
      fs.rmSync(path);
      return true;
    } catch {
      return false;
    }
  };
}
