/**
 * @link https://github.com/ai/size-limit/
 * @type {{name: string, path: string[], limit: string, import?: string, webpack?: boolean}[]}
 */
module.exports = [
  {
    name: "Only { a } (ESM)",
    path: ["dist/index.mjs"],
    import: "{ a }",
    limit: "108B",
  },
];
