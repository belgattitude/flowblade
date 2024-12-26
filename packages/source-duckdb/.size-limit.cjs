/**
 * @link https://github.com/ai/size-limit/
 * @type {{name: string, path: string[], limit: string, import?: string, webpack?: boolean}[]}
 */
module.exports = [
  {
    name: "All (ESM)",
    path: ["dist/index.mjs"],
    limit: "100kb",
  },
];
