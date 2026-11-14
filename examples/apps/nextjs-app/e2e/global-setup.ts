import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

import { E2E_BASE_URL, E2E_EXTERNAL_BASE_URL, E2E_PORT } from "./e2e.constants";

const require = createRequire(import.meta.url);
const STARTUP_TIMEOUT_MS = 60_000;

const waitForServer = async (
  url: string,
  server: ChildProcess | undefined
): Promise<void> => {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server !== undefined) {
      throw new Error(`next start exited early (code ${server.exitCode})`);
    }
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // not ready yet
    }
    await sleep(250);
  }
  throw new Error(`Server not ready after ${STARTUP_TIMEOUT_MS}ms at ${url}`);
};

/**
 * Starts the production server (`next start`) on E2E_PORT.
 * Requires `next build` to have run first (turbo does it: test-e2e dependsOn build).
 */
export default async function setup(): Promise<() => void> {
  if (E2E_EXTERNAL_BASE_URL !== undefined && E2E_EXTERNAL_BASE_URL !== "") {
    await waitForServer(E2E_EXTERNAL_BASE_URL, undefined);
    return () => undefined;
  }
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error(
      "No production build found (.next/BUILD_ID). Run `pnpm build` first."
    );
  }
  const server = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "start", "-p", `${E2E_PORT}`],
    {
      env: { ...process.env, BASE_URL: E2E_BASE_URL, PORT: `${E2E_PORT}` },
      stdio: "inherit",
    }
  );
  await waitForServer(E2E_BASE_URL, server);
  return () => {
    server.kill("SIGTERM");
  };
}
