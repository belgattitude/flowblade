export const duckdbExtensionsConfig = {
  install: [
    "azure",
    "httpfs",
    "excel",
    // 'vortex',
    "fts",
    // 'ducklake',
    // 'encodings', // 300MB _
  ],
  load: ["azure", "fts"],
} as const;
