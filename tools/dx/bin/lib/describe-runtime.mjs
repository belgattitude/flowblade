import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { familySync, versionSync } from "detect-libc";

/**
 * @typedef {{ name: string, version: string | null, source: string }} PackageManagerInfo
 * @typedef {{ name: string, version: string | null }} LibcInfo
 */

/** Lockfiles used to guess the package manager when package.json doesn't tell. */
const lockfiles = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === "object" && value !== null;

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const asString = (value) => (typeof value === "string" ? value : null);

/**
 * Parses `pnpm/12.13.0 npm/? node/v24.21.0 darwin arm64` (`npm_config_user_agent`,
 * set by the package managers when they run a script).
 *
 * @returns {{ name: string, version: string } | undefined}
 */
const readUserAgent = () => {
  const match = /^(?<name>[\w-]+)\/(?<version>\S+)/.exec(
    process.env.npm_config_user_agent ?? ""
  );
  const { name, version } = match?.groups ?? {};
  return name === undefined || version === undefined
    ? undefined
    : { name, version };
};

/**
 * Returns the package manager of the monorepo: the `devEngines.packageManager`
 * of the root package.json, then its `packageManager` (corepack), then the
 * package manager running the script, then the lockfile.
 *
 * @param {string} root
 * @returns {PackageManagerInfo | null}
 */
export const describePackageManager = (root) => {
  /** @type {unknown} */
  let manifest = {};
  try {
    manifest = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8")
    );
  } catch {
    // no or invalid package.json, see the other sources
  }
  if (isRecord(manifest)) {
    const { devEngines } = manifest;
    const declared = isRecord(devEngines)
      ? devEngines.packageManager
      : undefined;
    /** @type {unknown} */
    const devEngine = Array.isArray(declared)
      ? /** @type {unknown[]} */ (declared)[0]
      : declared;
    if (isRecord(devEngine)) {
      const name = asString(devEngine.name);
      if (name !== null) {
        return {
          name,
          version: asString(devEngine.version),
          source: "devEngines",
        };
      }
    }
    // name@version, optionally followed by +<hash>
    const match = /^(?<name>[^@]+)@(?<version>[^+]+)/.exec(
      asString(manifest.packageManager) ?? ""
    );
    const { name, version } = match?.groups ?? {};
    if (name !== undefined && version !== undefined) {
      return { name, version, source: "packageManager" };
    }
  }
  const userAgent = readUserAgent();
  if (userAgent !== undefined) {
    return { ...userAgent, source: "npm_config_user_agent" };
  }
  const lockfile = lockfiles.find(([file]) =>
    existsSync(path.join(root, file))
  );
  return lockfile === undefined
    ? null
    : { name: lockfile[1] ?? "", version: null, source: lockfile[0] ?? "" };
};

/**
 * Returns the version of the package manager running the script, when it's
 * `name` and differs from `version`.
 *
 * @param {PackageManagerInfo} packageManager
 * @returns {string | null}
 */
export const getRunningPackageManagerVersion = ({ name, version }) => {
  const userAgent = readUserAgent();
  return userAgent?.name === name && userAgent.version !== version
    ? userAgent.version
    : null;
};

/**
 * Returns the JavaScript runtime running dx-doctor: deno, bun or node (deno and
 * bun also expose `process.versions.node`).
 *
 * @returns {{ name: string, version: string }}
 */
export const describeJsRuntime = () => {
  /** @type {unknown} */
  const deno = Reflect.get(globalThis, "Deno");
  if (isRecord(deno) && isRecord(deno.version)) {
    return { name: "deno", version: asString(deno.version.deno) ?? "unknown" };
  }
  const { bun, node } = process.versions;
  if (bun !== undefined) {
    return { name: "bun", version: bun };
  }
  return { name: "node", version: node };
};

/**
 * Returns the C library of the runtime on Linux, glibc or musl (Alpine), with
 * its version (`detect-libc`). `null` on the other platforms (macOS, Windows).
 *
 * @returns {LibcInfo | null}
 */
export const describeLibc = () => {
  const name = familySync();
  return name === null ? null : { name, version: versionSync() };
};
