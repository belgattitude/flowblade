#!/usr/bin/env node

/**
 * Prints the monorepo settings resolved by @flowblade/dx: the monorepo root,
 * the global cache directory (see `getGlobalCacheDir`) with its tool caches,
 * and the turbo cache when turbo is installed.
 *
 * @example dx-doctor
 * @example DX_BASE_CACHE_DIR=/tmp dx-doctor --json
 * @example ls "$(dx-doctor --show-cache=vitest)"
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { styleText } from "node:util";

import prettyBytes from "pretty-bytes";

import {
  dxBaseCacheDirEnv,
  dxDisableCacheEnv,
  findMonorepoRoot,
  getGlobalCacheDir,
  isCacheDisabled,
} from "../src/cache/monorepo-cache-dir.ts";
import {
  describeJsRuntime,
  describeLibc,
  describePackageManager,
  getRunningPackageManagerVersion,
} from "./lib/describe-runtime.mjs";
import { measure } from "./lib/measure.mjs";

const help = `Usage: dx-doctor [options]

Prints the monorepo root, the package manager and the JavaScript runtime, the global cache directory (${dxBaseCacheDirEnv}), the
tool caches (typescript, vitest) and the turbo cache when turbo is installed.

Options:
  --json             Print the result as JSON
  --show-cache=<cache>
                     Only print the directory of a cache: base (global cache),
                     typescript, vitest or turbo
  -h, --help         Show this help
`;

/** Tools writing in the global cache (`getMonorepoCacheDir(tool)`). */
const tools = ["typescript", "vitest"];

/**
 * @typedef {{ dir: string, exists: boolean, files: number, bytes: number }} DirInfo
 */

/** Counting the cached files is skipped for `--show-cache`. */
let measureDirs = true;

/**
 * @param {string} dir
 * @returns {DirInfo}
 */
const describeDir = (dir) => {
  return {
    dir,
    exists: existsSync(dir),
    ...(measureDirs ? measure(dir) : { files: 0, bytes: 0 }),
  };
};

/**
 * Reads the `cacheDir` of the root turbo.json or turbo.jsonc (a regex, so the
 * jsonc comments don't need to be parsed).
 *
 * @param {string} root
 * @returns {{ file: string, cacheDir: string | undefined } | undefined}
 */
const readTurboConfig = (root) => {
  for (const name of ["turbo.json", "turbo.jsonc"]) {
    const file = path.join(root, name);
    if (existsSync(file)) {
      const match = /"cacheDir"\s*:\s*"([^"]+)"/.exec(
        readFileSync(file, "utf8")
      );
      return { file: name, cacheDir: match?.[1] };
    }
  }
  return undefined;
};

/**
 * Resolves turbo from the monorepo root, and its local cache directory:
 * `TURBO_CACHE_DIR`, then the turbo config `cacheDir`, then `.turbo/cache`
 * (turbo default).
 *
 * @param {string} root
 */
const describeTurbo = (root) => {
  /** @type {string} */
  let version;
  try {
    const require = createRequire(path.join(root, "package.json"));
    /** @type {unknown} */
    const turboPackage = require("turbo/package.json");
    version =
      typeof turboPackage === "object" &&
      turboPackage !== null &&
      "version" in turboPackage
        ? String(turboPackage.version)
        : "unknown";
  } catch {
    return { installed: false };
  }
  const config = readTurboConfig(root);
  const { TURBO_CACHE_DIR: envCacheDir } = process.env;
  let cacheDir = ".turbo/cache";
  let source = "default";
  if (envCacheDir !== undefined && envCacheDir !== "") {
    cacheDir = envCacheDir;
    source = "TURBO_CACHE_DIR";
  } else if (config?.cacheDir !== undefined) {
    ({ cacheDir } = config);
    source = config.file;
  }
  return {
    installed: true,
    version,
    config: config?.file ?? null,
    cache: { ...describeDir(path.resolve(root, cacheDir)), source },
  };
};

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(help);
  process.exit(0);
}
const showCachePrefix = "--show-cache=";
const caches = ["base", ...tools, "turbo"];
const unknown = args.find(
  (arg) => arg !== "--json" && !arg.startsWith(showCachePrefix)
);
if (unknown !== undefined) {
  console.error(`dx-doctor: unknown option "${unknown}"\n\n${help}`);
  process.exit(1);
}
const showCache = args
  .findLast((arg) => arg.startsWith(showCachePrefix))
  ?.slice(showCachePrefix.length);
if (showCache !== undefined && !caches.includes(showCache)) {
  console.error(
    `dx-doctor: unknown cache "${showCache}", expected one of ${caches.join(", ")}`
  );
  process.exit(1);
}

const root = findMonorepoRoot();
if (root === undefined) {
  console.error(
    `dx-doctor: no pnpm-workspace.yaml found from ${process.cwd()}`
  );
  process.exit(1);
}

/**
 * @param {string} name
 * @returns {string | null} the value of the variable, null when unset or empty
 */
const readEnv = (name) => {
  const value = process.env[name];
  return value === undefined || value === "" ? null : value;
};

const globalCacheDir = getGlobalCacheDir(root);
measureDirs = showCache === undefined;
const packageManager = describePackageManager(root);
const report = {
  root,
  runtime: {
    packageManager:
      packageManager === null
        ? null
        : {
            ...packageManager,
            running: getRunningPackageManagerVersion(packageManager),
          },
    js: describeJsRuntime(),
    platform: process.platform,
    arch: process.arch,
    libc: describeLibc(),
  },
  cache: {
    disabled: isCacheDisabled(),
    ...describeDir(globalCacheDir),
    tools: Object.fromEntries(
      tools.map((tool) => [tool, describeDir(path.join(globalCacheDir, tool))])
    ),
  },
  turbo: describeTurbo(root),
  env: {
    [dxBaseCacheDirEnv]: readEnv(dxBaseCacheDirEnv),
    [dxDisableCacheEnv]: readEnv(dxDisableCacheEnv),
    TURBO_CACHE_DIR: readEnv("TURBO_CACHE_DIR"),
  },
};

if (showCache !== undefined) {
  /** @type {Record<string, string | undefined>} */
  const dirs = {
    base: report.cache.dir,
    turbo: report.turbo.cache?.dir,
    ...Object.fromEntries(
      Object.entries(report.cache.tools).map(([tool, { dir }]) => [tool, dir])
    ),
  };
  const dir = dirs[showCache];
  if (dir === undefined) {
    console.error(`dx-doctor: no ${showCache} cache (turbo is not installed)`);
    process.exit(1);
  }
  console.log(dir);
  process.exit(0);
}

if (args.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

/**
 * @param {string} text
 * @returns {string}
 */
const dim = (text) => styleText("dim", text);

/**
 * Formats the sections with the labels aligned across all of them.
 *
 * @param {[string, [string, string][]][]} sections title and rows
 * @returns {string}
 */
const formatSections = (sections) => {
  const width = Math.max(
    ...sections.flatMap(([, rows]) => rows.map(([label]) => label.length))
  );
  return sections
    .map(([title, rows]) =>
      [
        styleText("bold", title),
        ...rows.map(([label, value]) => `  ${label.padEnd(width)}  ${value}`),
      ].join("\n")
    )
    .join("\n\n");
};

const { turbo } = report;

/** @type {[string, DirInfo][]} label and cache */
const cacheEntries = [
  ["base", report.cache],
  ...tools.map(
    (tool) =>
      /** @type {[string, DirInfo]} */ ([
        tool,
        report.cache.tools[tool] ?? describeDir(""),
      ])
  ),
  ...(turbo.cache === undefined
    ? []
    : [/** @type {[string, DirInfo]} */ (["turbo", turbo.cache])]),
];

/**
 * The cache rows, with the directory, files, size and note columns aligned.
 *
 * @type {[string, string][]}
 */
const cacheRows = (() => {
  const columns = cacheEntries.map(([label, { dir, exists, files, bytes }]) => {
    const notes = [
      ...(report.cache.disabled && label !== "turbo" ? ["disabled"] : []),
      ...(exists ? [] : ["missing"]),
    ];
    return {
      label,
      dir,
      files: exists ? `${files.toLocaleString("en-US")} files` : "",
      size: exists ? prettyBytes(bytes) : "",
      note: notes.join(", "),
    };
  });
  /**
   * @param {"dir" | "files" | "size"} key
   * @returns {number}
   */
  const widthOf = (key) =>
    Math.max(...columns.map((column) => column[key].length));
  const [dirWidth, filesWidth, sizeWidth] = [
    widthOf("dir"),
    widthOf("files"),
    widthOf("size"),
  ];
  return columns.map(({ label, dir, files, size, note }) => [
    label,
    [
      dir.padEnd(dirWidth),
      files.padStart(filesWidth),
      size.padStart(sizeWidth),
      note === "" ? "" : dim(`(${note})`),
    ]
      .join("  ")
      .trimEnd(),
  ]);
})();

const { runtime } = report;
const pm = runtime.packageManager;
/** @type {[string, string][]} */
const runtimeRows = [
  [
    "package manager",
    pm === null
      ? dim("(not detected)")
      : [
          pm.name,
          pm.version ?? "",
          dim(`(${pm.source})`),
          pm.running === null ? "" : `running ${pm.running}`,
        ]
          .filter((part) => part !== "")
          .join(" "),
  ],
  ["js runtime", `${runtime.js.name} ${runtime.js.version}`],
  ["platform", `${runtime.platform} ${runtime.arch}`],
  [
    "libc",
    runtime.libc === null
      ? dim(`(n/a on ${runtime.platform})`)
      : [runtime.libc.name, runtime.libc.version ?? ""].join(" ").trim(),
  ],
];

console.log(
  formatSections([
    ["Monorepo", [["root", root]]],
    ["Runtime", runtimeRows],
    ["Caches", cacheRows],
    [
      "Turbo",
      turbo.installed
        ? [
            ["version", turbo.version ?? "unknown"],
            ["config", turbo.config ?? dim("(none)")],
          ]
        : [["installed", dim("no")]],
    ],
    [
      "Env",
      Object.entries(report.env).map(([name, value]) => [
        name,
        value ?? dim("(not set)"),
      ]),
    ],
  ])
);
