export const duckdbExtensionsConfig = {
  install: [
    // "azure", // 12Mb
    "httpfs", // 15Mb
    "excel", // 8Mb
    "fts", // 5Mb
    "quack", // 25Mb
    // "vortex", // 55Mb
    // "ducklake", // 29Mb
    // "sqlite", // 26Mb
    // "vss", // 25Mb
    // 'encodings', // 300MB _
  ],
  load: ["azure", "fts"],
} as const;
