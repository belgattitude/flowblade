import fs from "node:fs";
import path from "node:path";

import { config } from "@dotenvx/dotenvx";
import { DuckDBInstance } from "@duckdb/node-api";
import c from "tinyrainbow";

import { CliFormat } from "#cli/format.ts";
import { CliHash } from "#cli/hash.ts";
import { CliManifest } from "#cli/manifest.ts";
import { CliReport } from "#cli/report.ts";
import { CliTable } from "#cli/table.ts";
import { duckdbExtensionsConfig } from "#server/config/duckdb-extensions.config.ts";

config({
  path: [".env.local", ".env.development", ".env"],
  ignore: ["MISSING_ENV_FILE"],
  quiet: true,
  strict: true,
});

const getDuckDbExtensionDirFromEnv = async () => {
  const serverEnv = await import("../src/env/server.env.mjs").then(
    (mod) => mod.serverEnv
  );
  return serverEnv.DUCKDB_EXTENSION_DIRECTORY!;
};

const extDirFromEnv = await getDuckDbExtensionDirFromEnv();
// Convert to absolute path, relative to cwd if not already absolute
const extDir = path.resolve(process.cwd(), extDirFromEnv);

// show a relative path only when the directory is inside the app
const relativeDir = path.relative(process.cwd(), extDir);
const displayDir = relativeDir.startsWith("..") ? extDir : relativeDir;

const totalStart = performance.now();

// extensions are stored as <dir>/<duckdb version>/<platform>/<name>.duckdb_extension
const findInstalledExtensionFile = (
  extension: string
): { file: string; modified: Date; size: number } | undefined => {
  const candidates = fs
    .readdirSync(extDir, { recursive: true, withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && entry.name === `${extension}.duckdb_extension`
    )
    .map((entry) => {
      const file = path.join(entry.parentPath, entry.name);
      const { mtime, mtimeMs, size } = fs.statSync(file);
      return { file, mtimeMs, modified: mtime, size };
    })
    // several duckdb versions may coexist, use the most recent one
    .toSorted((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0];
};

const manifestDir = path.join(import.meta.dirname, "../data/duckdb");
const manifestFile = path.join(manifestDir, "duckdb-extensions-manifest.json");

type ManifestEntry = {
  name: string;
  /** Extension version as reported by duckdb (git commit hash for core extensions) */
  version: string | null;
  /** sha256 of the installed .duckdb_extension file */
  sha256: string;
  sizeBytes: number;
  /** Path relative to the extension directory */
  file: string;
  installedAt: string;
};
const manifestEntries: ManifestEntry[] = [];

const getInstalledExtensionVersion = async (
  extension: string
): Promise<string | undefined> => {
  const result = await conn.runAndReadAll(
    `SELECT extension_version FROM duckdb_extensions() WHERE extension_name = '${extension}'`
  );
  const version = result.getRowObjectsJson()[0]?.extension_version;
  return typeof version === "string" && version !== "" ? version : undefined;
};

let totalBytes = 0;

console.log(
  `${c.cyan("⚡")} ${c.bold("Preinstalling DuckDB extensions")} ${c.dim(`(${duckdbExtensionsConfig.install.join(", ")}) — this may take a while`)}`
);
console.log(
  c.dim(
    "  tip: edit the extensions to install in src/server/config/duckdb-extensions.config.ts"
  )
);

const instance = await DuckDBInstance.create(":memory:");
const conn = await instance.connect();

const extensions = duckdbExtensionsConfig.install;

type Row = {
  name: string;
  version: string;
  modified: string;
  size: string;
  time: string;
  error?: string;
};
const rows: Row[] = [];
const errors: string[] = [];
let installed = 0;
let failed = 0;

try {
  await conn.run(`SET extension_directory='${extDir}'`);
} catch (error) {
  failed++;
  errors.push(
    `cannot set extension directory (${CliFormat.errorMessage(error)})`
  );
}

for (const extension of extensions) {
  const start = performance.now();
  try {
    await conn.runAndReadAll(`FORCE INSTALL ${extension}`);
    installed++;
    const installedFile = findInstalledExtensionFile(extension);
    totalBytes += installedFile?.size ?? 0;
    const version = await getInstalledExtensionVersion(extension);
    if (installedFile !== undefined) {
      manifestEntries.push({
        file: path.relative(extDir, installedFile.file),
        installedAt: installedFile.modified.toISOString(),
        name: extension,
        sha256: CliHash.sha256(fs.readFileSync(installedFile.file)),
        sizeBytes: installedFile.size,
        version: version ?? null,
      });
    }
    rows.push({
      name: extension,
      modified:
        installedFile === undefined
          ? "?"
          : installedFile.modified.toISOString().slice(0, 10),
      size:
        installedFile === undefined
          ? "?"
          : CliFormat.formatBinarySize(installedFile.size),
      time: CliFormat.ms(start),
      version: version ?? "?",
    });
  } catch (error) {
    failed++;
    rows.push({
      error: CliFormat.errorMessage(error),
      name: extension,
      modified: "-",
      size: "-",
      time: CliFormat.ms(start),
      version: "-",
    });
  }
}

const getDuckDbRuntimeInfo = async () => {
  const [version, platform] = await Promise.all([
    conn.runAndReadAll(
      "SELECT library_version, source_id FROM pragma_version()"
    ),
    conn.runAndReadAll("SELECT platform FROM pragma_platform()"),
  ]);
  const [versionRow] = version.getRowObjectsJson();
  const [platformRow] = platform.getRowObjectsJson();
  return {
    duckdbSourceId: versionRow?.source_id ?? null,
    duckdbVersion: versionRow?.library_version ?? null,
    platform: platformRow?.platform ?? null,
  };
};

let runtimeInfo: Awaited<ReturnType<typeof getDuckDbRuntimeInfo>> | undefined;
try {
  runtimeInfo = await getDuckDbRuntimeInfo();
} catch {
  // not critical, the manifest is still written without them
}

conn.closeSync();

const manifestError = CliManifest.write(manifestFile, {
  duckdbSourceId: runtimeInfo?.duckdbSourceId ?? null,
  duckdbVersion: runtimeInfo?.duckdbVersion ?? null,
  extensions: manifestEntries.toSorted((a, b) => a.name.localeCompare(b.name)),
  generatedAt: new Date().toISOString(),
  platform: runtimeInfo?.platform ?? null,
});

const title =
  failed > 0
    ? "DuckDB extensions installed with errors"
    : "DuckDB extensions installed";

const nameWidth = CliTable.columnWidth(rows.map((r) => r.name));
const versionWidth = CliTable.columnWidth(rows.map((r) => r.version));
const modifiedWidth = CliTable.columnWidth(rows.map((r) => r.modified));
const sizeWidth = CliTable.columnWidth(rows.map((r) => r.size));
const timeWidth = CliTable.columnWidth(rows.map((r) => r.time));

const lines = [
  ...errors.map((message) => `  ${c.red("✖")} ${c.red(message)}`),
  ...rows.map((row) => {
    const rowIcon = row.error === undefined ? c.green("+") : c.red("✖");
    const detail = row.error === undefined ? "" : ` ${c.red(row.error)}`;
    return `  ${rowIcon} ${row.name.padEnd(nameWidth)}  ${c.cyan(row.version.padEnd(versionWidth))}  ${c.dim(row.modified.padEnd(modifiedWidth))}  ${c.dim(row.size.padStart(sizeWidth))}  ${c.yellow(row.time.padStart(timeWidth))}${detail}`;
  }),
];

console.log(
  [
    CliReport.titleLine(
      failed === 0,
      title,
      `${installed}/${extensions.length} installed, ${failed} failed, ${CliFormat.formatBinarySize(totalBytes)} total`
    ),
    CliReport.labelLine("dir", c.cyan(displayDir)),
    CliManifest.line(manifestFile, manifestError),
    ...lines,
    CliReport.labelLine("total", c.bold(c.yellow(CliFormat.ms(totalStart)))),
  ].join("\n")
);
