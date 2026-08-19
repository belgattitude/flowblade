import fs from "node:fs";

/**
 * Create a directory recursively if it doesn't exist'
 *
 * @throws Error if it can't be created
 */
export const createDirectory = (path: string) => {
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
};

export const createAndEnsureWritableDirectory = (
  label: string,
  path?: string | undefined
) => {
  if (path === undefined) {
    return;
  }
  if (!fs.existsSync(path)) {
    try {
      createDirectory(path);
    } catch (error) {
      throw new Error(
        `Failed to create ${label} '${path}' - ${(error as Error)?.message ?? ""}`,
        { cause: error }
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
};
