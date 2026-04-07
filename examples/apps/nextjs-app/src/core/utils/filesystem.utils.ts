import fs from 'node:fs';

/**
 * Create a directory recursively
 *
 * @throws Error if it can't be created
 */
export const createDirectory = (path: string) => {
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
};

export const createOrEnsureWritableDirectory = (
  label: string,
  path: string | undefined
) => {
  if (path === undefined) {
    return;
  }
  if (!fs.existsSync(path)) {
    try {
      createDirectory(path);
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
