import type { ParsedDsn } from "@httpx/dsn-parser";

import type { DuckConnectionParams } from "./types.ts";

/**
 * Map a parsed DSN to unvalidated connection params, ie for
 * `duckdb://filesystem/main_db?path=/tmp/db.duckdb&accessMode=READ_ONLY`:
 *
 * ```js
 * { type: 'filesystem', alias: 'main_db', path: '/tmp/db.duckdb', options: { accessMode: 'READ_ONLY' } }
 * ```
 *
 * An empty `path` is treated as absent. The result is NOT validated (the
 * type is only asserted), it must be piped into a connection params schema.
 */
export const dsnToConnectionParams = (
  parsed: ParsedDsn
): DuckConnectionParams => {
  const { path, ...options } = parsed.params ?? {};
  const base = {
    type: parsed.host,
    alias: parsed.db,
    options,
  };
  return (
    path === undefined || path === "" ? base : { ...base, path }
  ) as DuckConnectionParams;
};
