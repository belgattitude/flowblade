#!/usr/bin/env node

/**
 * Runs the given command unless a CI environment is detected (std-env `isCI`),
 * forwarding its arguments, the signals and the exit code. Exits with 0 in CI.
 *
 * @example dx-unless-ci skills experimental_install
 */

import { isCI } from "std-env";

import { runCommand } from "./lib/run-package-bin.mjs";

const [command, ...args] = process.argv.slice(2);

if (command === undefined) {
  console.error("dx-unless-ci: missing command, usage: dx-unless-ci <command> [args...]");
  process.exit(1);
}

if (isCI) {
  console.log(`dx-unless-ci: CI environment detected, skipping "${command}"`);
  process.exit(0);
}

runCommand(command, args, { shell: process.platform === "win32" });
