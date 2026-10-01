// @ts-check
/**
 * Copy the fontsource font files into the app so next/font/local can load
 * them with a stable relative path.
 *
 * next/font/local only resolves paths relative to the calling file, so pointing
 * it to node_modules breaks as soon as the pnpm linker changes (isolated vs
 * hoisted on vercel / docker). Node resolution works with any linker.
 *
 * Runs before `next dev` / `next build`, the copied files are git ignored.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const destDir = path.join(import.meta.dirname, "../src/components/fonts/files");

/** @type {Array<{ pkg: string, file: string }>} */
const fonts = [
  { pkg: "@fontsource-variable/inter", file: "inter-latin-wght-normal.woff2" },
  {
    pkg: "@fontsource-variable/jetbrains-mono",
    file: "jetbrains-mono-latin-wght-normal.woff2",
  },
  {
    pkg: "@fontsource-variable/plus-jakarta-sans",
    file: "plus-jakarta-sans-latin-wght-normal.woff2",
  },
];

mkdirSync(destDir, { recursive: true });

for (const { pkg, file } of fonts) {
  const src = require.resolve(`${pkg}/files/${file}`);
  const dest = path.join(destDir, file);
  // Avoid touching unchanged files (prevents needless rebuilds in dev)
  if (existsSync(dest) && readFileSync(src).equals(readFileSync(dest))) {
    continue;
  }
  copyFileSync(src, dest);
}
