import { readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Counts the files (symlinks are not followed) under `entryPath`.
 *
 * @param {string} entryPath
 * @returns {{ files: number, bytes: number }}
 */
export const measure = (entryPath) => {
  const stats = statSync(entryPath, { throwIfNoEntry: false });
  if (stats === undefined) {
    return { files: 0, bytes: 0 };
  }
  if (!stats.isDirectory()) {
    return { files: 1, bytes: stats.size };
  }
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(entryPath, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const child = measure(path.join(entryPath, entry.name));
    files += child.files;
    bytes += child.bytes;
  }
  return { files, bytes };
};
