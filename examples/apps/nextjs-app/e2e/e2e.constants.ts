export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * When E2E_BASE_URL is set, tests run against that already running server
 * (no `next start` is spawned).
 */
export const E2E_EXTERNAL_BASE_URL = process.env.E2E_BASE_URL;

export const E2E_BASE_URL =
  E2E_EXTERNAL_BASE_URL !== undefined && E2E_EXTERNAL_BASE_URL !== ""
    ? E2E_EXTERNAL_BASE_URL
    : `http://localhost:${E2E_PORT}`;
