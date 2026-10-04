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
import crypto from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import c from "tinyrainbow";

import { nextjsLocalFontsConfig } from "../src/server/config/nextjs-local-fonts.config";

const require = createRequire(import.meta.url);

const { destDir, fonts, manifestFile } = nextjsLocalFontsConfig;

mkdirSync(destDir, { recursive: true });

const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

type Row = { file: string; pkg: string; size: string; copied: boolean };
type ManifestEntry = {
  package: string;
  version: string | null;
  file: string;
  /** Path relative to the app root */
  path: string;
  sizeBytes: number;
  sha256: string;
};
const manifestEntries: ManifestEntry[] = [];
const rows: Row[] = [];
let copied = 0;
let totalBytes = 0;

for (const { pkg, file } of fonts) {
  const src = require.resolve(`${pkg}/files/${file}`);
  const dest = path.join(destDir, file);
  const { size } = statSync(src);
  totalBytes += size;
  const srcContent = readFileSync(src);
  // Avoid touching unchanged files (prevents needless rebuilds in dev)
  const upToDate = existsSync(dest) && srcContent.equals(readFileSync(dest));
  if (!upToDate) {
    copyFileSync(src, dest);
    copied++;
  }
  rows.push({ copied: !upToDate, file, pkg, size: formatKb(size) });

  // fonts are stored as <package root>/files/<file>
  let version: string | null = null;
  try {
    const packageJson = JSON.parse(
      readFileSync(
        path.join(path.dirname(path.dirname(src)), "package.json"),
        "utf-8"
      )
    ) as { version?: string };
    version = packageJson.version ?? null;
  } catch {
    // version stays unknown
  }
  manifestEntries.push({
    file,
    package: pkg,
    path: path.relative(path.join(import.meta.dirname, ".."), dest),
    sha256: crypto.createHash("sha256").update(srcContent).digest("hex"),
    sizeBytes: size,
    version,
  });
}

let manifestLine = `  ${c.dim("manifest:")} ${c.cyan(path.relative(process.cwd(), manifestFile))}`;
try {
  mkdirSync(path.dirname(manifestFile), { recursive: true });
  writeFileSync(
    manifestFile,
    `${JSON.stringify(
      {
        fonts: manifestEntries,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    "utf-8"
  );
} catch (error) {
  manifestLine = `  ${c.dim("manifest:")} ${c.red(`failed to write (${error instanceof Error ? error.message : "unknown error"})`)}`;
  process.exitCode = 1;
}

const fileWidth = Math.max(...rows.map((r) => r.file.length));
const sizeWidth = Math.max(...rows.map((r) => r.size.length));
const statusWidth = "up to date".length;

const lines = rows.map((row) => {
  const icon = row.copied ? c.green("+") : c.dim("•");
  const status = (row.copied ? "copied" : "up to date").padEnd(statusWidth);
  return `  ${icon} ${row.file.padEnd(fileWidth)}  ${c.dim(row.size.padStart(sizeWidth))}  ${row.copied ? c.green(status) : c.dim(status)}  ${c.dim(row.pkg)}`;
});

console.log(
  [
    `${c.green("✔")} ${c.bold("Local fonts ready for next/font/local")} ${c.dim(`(${copied} copied, ${fonts.length - copied} up to date, ${formatKb(totalBytes)} total)`)}`,
    `  ${c.dim("dest:")}     ${c.cyan(path.relative(process.cwd(), destDir))}`,
    manifestLine,
    ...lines,
  ].join("\n")
);
