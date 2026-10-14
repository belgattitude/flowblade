import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === "object" && value !== null;

/**
 * Resolves the package.json of a @flowblade/dx dependency, whether or not the
 * package exports it (ie: es-check doesn't).
 *
 * @param {string} pkgName
 * @returns {string}
 */
export const resolvePackageJson = (pkgName) => {
  const pkgJsonPath = (require.resolve.paths(pkgName) ?? [])
    .map((nodeModulesDir) => path.join(nodeModulesDir, pkgName, "package.json"))
    .find((candidate) => existsSync(candidate));
  if (pkgJsonPath === undefined) {
    throw new Error(`unable to locate the ${pkgName} package`);
  }
  return pkgJsonPath;
};

/**
 * Resolves the `<pkg>` bin declared in the package.json of a @flowblade/dx
 * dependency.
 *
 * @param {string} pkgName
 * @returns {string}
 */
const resolvePackageBin = (pkgName) => {
  const pkgJsonPath = resolvePackageJson(pkgName);
  /** @type {unknown} */
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  const bin = isRecord(pkgJson) ? pkgJson.bin : undefined;
  const binEntry = isRecord(bin) ? bin[pkgName] : bin;
  if (typeof binEntry !== "string") {
    throw new TypeError(`no ${pkgName} bin declared in ${pkgJsonPath}`);
  }
  const binPath = path.join(path.dirname(pkgJsonPath), binEntry);
  if (!existsSync(binPath)) {
    throw new Error(`unable to locate the ${pkgName} bin (${binPath})`);
  }
  return binPath;
};

/**
 * Resolves the native tsgolint executable shipped with the oxlint-tsgolint
 * version pinned by @flowblade/dx.
 *
 * @returns {string}
 */
export const resolveTsgolintExecutable = () => {
  const tsgolintRequire = createRequire(
    require.resolve("oxlint-tsgolint/package.json")
  );
  const exe = process.platform === "win32" ? "tsgolint.exe" : "tsgolint";
  return tsgolintRequire.resolve(
    `@oxlint-tsgolint/${process.platform}-${process.arch}/${exe}`
  );
};

/**
 * Runs the package bin pinned by @flowblade/dx, forwarding all cli
 * arguments (after `options.args`), signals and the exit code.
 *
 * @param {string} pkgName
 * @param {{ env?: Record<string, string>, args?: string[] }} [options]
 */
export const runPackageBin = (pkgName, options = {}) => {
  const child = spawn(
    process.execPath,
    [
      resolvePackageBin(pkgName),
      ...(options.args ?? []),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit", env: { ...process.env, ...options.env } }
  );

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  child.on("error", (error) => {
    console.error(`dx: failed to run ${pkgName}: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
};
