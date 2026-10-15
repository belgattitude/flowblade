import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { getMonorepoCacheDir } from "../../src/cache/monorepo-cache-dir.ts";
import { runCommand, runPackageBin } from "./run-package-bin.mjs";

/**
 * @param {string[]} tscArgs
 * @returns {string} the `--project` / `-p` tsconfig, `tsconfig.json` by default
 */
const getProject = (tscArgs) => {
  const index = tscArgs.findIndex((arg) => arg === "--project" || arg === "-p");
  const inline = tscArgs.find((arg) => arg.startsWith("--project="));
  const project =
    (index === -1 ? undefined : tscArgs[index + 1]) ??
    inline?.slice("--project=".length) ??
    "tsconfig.json";
  return project.endsWith(".json")
    ? project
    : path.join(project, "tsconfig.json");
};

/**
 * Stores the incremental build info of the tsconfig in
 * `<root>/.cache/typescript/<package path>/<tsconfig name>.tsbuildinfo`
 * (overriding the tsconfig `tsBuildInfoFile`), unless `--tsBuildInfoFile` is
 * given or outside the monorepo.
 *
 * @param {string[]} tscArgs
 * @returns {string[]}
 */
const withMonorepoBuildInfo = (tscArgs) => {
  const cacheDir = getMonorepoCacheDir("typescript");
  if (
    cacheDir === undefined ||
    tscArgs.some((arg) => arg.startsWith("--tsBuildInfoFile"))
  ) {
    return tscArgs;
  }
  const name = path.basename(getProject(tscArgs), ".json");
  return [
    ...tscArgs,
    "--tsBuildInfoFile",
    path.join(cacheDir, `${name}.tsbuildinfo`),
  ];
};

/**
 * `bun check` runs the `check` script of the package.json in the working
 * directory instead of the type checker when there's one: it's run from the
 * tmp directory, with absolute paths.
 *
 * @param {string[]} tscArgs
 * @returns {string[]}
 */
const toBunCheckArgs = (tscArgs) => {
  const cwd = process.cwd();
  /** @type {string[]} */
  const bunArgs = [];
  let hasProject = false;
  for (let i = 0; i < tscArgs.length; i++) {
    const arg = tscArgs[i] ?? "";
    const next = tscArgs[i + 1];
    if ((arg === "--project" || arg === "-p") && next !== undefined) {
      bunArgs.push("--project", path.resolve(cwd, next));
      hasProject = true;
      i++;
    } else if (arg.startsWith("--project=")) {
      bunArgs.push(
        `--project=${path.resolve(cwd, arg.slice("--project=".length))}`
      );
      hasProject = true;
    } else if (!arg.startsWith("-") && existsSync(path.resolve(cwd, arg))) {
      // files or directories to check
      bunArgs.push(path.resolve(cwd, arg));
    } else {
      bunArgs.push(arg);
    }
  }
  return hasProject ? bunArgs : ["--project", cwd, ...bunArgs];
};

/**
 * tsc arguments that don't type check (or never exit): no summary for them.
 */
const noSummaryArgs = new Set([
  "--help",
  "-h",
  "--all",
  "--version",
  "-v",
  "--init",
  "--showConfig",
  "--listFilesOnly",
  "--watch",
  "-w",
]);

/**
 * Type checks with the tsc version pinned by @flowblade/dx, or with
 * `bun check` (bun >= 1.4.3, the bun of the PATH), forwarding the tsc
 * arguments, signals and the exit code. tsc prints nothing when there's no
 * error: a `✓ No type errors [duration]` summary is added (`bun check` has its
 * own). The tsc build info is stored in the monorepo cache.
 *
 * @param {{ bun: boolean, args: string[] }} options
 */
export const runTypecheck = ({ bun, args }) => {
  if (bun) {
    runCommand("bun", ["check", ...toBunCheckArgs(args)], {
      cwd: os.tmpdir(),
    });
  } else {
    const start = performance.now();
    const summary = !args.some((arg) => noSummaryArgs.has(arg));
    runPackageBin("typescript", {
      bin: "tsc",
      argv: summary ? withMonorepoBuildInfo(args) : args,
      onExit: (code) => {
        if (summary && code === 0) {
          console.log(
            `✓ No type errors [${(performance.now() - start).toFixed(2)}ms]`
          );
        }
      },
    });
  }
};
