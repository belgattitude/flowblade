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
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import c from "tinyrainbow";

import { CliFormat } from "#cli/format.ts";
import { CliHash } from "#cli/hash.ts";
import { CliManifest } from "#cli/manifest.ts";
import { CliReport } from "#cli/report.ts";
import { CliTable } from "#cli/table.ts";

import { nextjsLocalFontsConfig } from "../src/server/config/nextjs-local-fonts.config.ts";

const require = createRequire(import.meta.url);

const { destDir, fonts, manifestFile } = nextjsLocalFontsConfig;

mkdirSync(destDir, { recursive: true });

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
  rows.push({ copied: !upToDate, file, pkg, size: CliFormat.formatKb(size) });

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
    sha256: CliHash.sha256(srcContent),
    sizeBytes: size,
    version,
  });
}

const manifestError = CliManifest.write(manifestFile, {
  fonts: manifestEntries,
  generatedAt: new Date().toISOString(),
});
if (manifestError !== undefined) {
  process.exitCode = 1;
}

const fileWidth = CliTable.columnWidth(rows.map((r) => r.file));
const sizeWidth = CliTable.columnWidth(rows.map((r) => r.size));
const statusWidth = "up to date".length;

const lines = rows.map((row) => {
  const icon = row.copied ? c.green("+") : c.dim("•");
  const status = (row.copied ? "copied" : "up to date").padEnd(statusWidth);
  return `  ${icon} ${row.file.padEnd(fileWidth)}  ${c.dim(row.size.padStart(sizeWidth))}  ${row.copied ? c.green(status) : c.dim(status)}  ${c.dim(row.pkg)}`;
});

console.log(
  [
    CliReport.titleLine(
      true,
      "Local fonts ready for next/font/local",
      `${copied} copied, ${fonts.length - copied} up to date, ${CliFormat.formatKb(totalBytes)} total`
    ),
    CliReport.labelLine("dest", c.cyan(CliReport.displayPath(destDir))),
    CliManifest.line(manifestFile, manifestError),
    ...lines,
  ].join("\n")
);
