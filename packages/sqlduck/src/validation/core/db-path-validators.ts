import isSafeFilename from "is-safe-filename";

export const duckDbPathMessages = {
  filename:
    "Invalid database filename - it must be a safe filename (no path traversal, no absolute paths, no reserved names, etc.)",
  pathname:
    "Invalid database pathname - it must be an absolute path with no traversal",
} as const;

const toSegments = (path: string): string[] =>
  path.replaceAll("\\", "/").split("/");

/**
 * Check whether the filename part of a database path is a safe filename
 */
export const isSafeDbFilename = (path: string): boolean => {
  const filename = toSegments(path).at(-1);
  return filename !== undefined && isSafeFilename(filename);
};

/**
 * Check whether the directory part of a database path has no traversal
 */
export const isSafeDbPathname = (path: string): boolean => {
  const pathname =
    "/" + toSegments(path).slice(0, -1).filter(Boolean).join("/");
  return (
    pathname.length > 0 && pathname.startsWith("/") && !pathname.includes("..")
  );
};
