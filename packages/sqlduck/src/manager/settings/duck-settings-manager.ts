import { AsyncLocalStorage } from "node:async_hooks";

import type { DuckDBConnection } from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";

import { sqlduckDefaultLogtapeLogger } from "../../logger/sqlduck-default-logtape-logger.ts";
import { getErrorMessage } from "../../utils/get-error-message.ts";
import { quoteIdentifier, quoteValue } from "../../utils/quote-value.ts";
import { ManagerQueryExecutor } from "../core/manager-query-executor.ts";
import type {
  DuckSessionSettings,
  DuckSettingValue,
} from "./duck-settings.types.ts";
import { toSettingLiteral } from "./to-setting-literal.ts";

type SessionSettingsLayer = {
  conn: DuckDBConnection;
  settings: Readonly<Record<string, DuckSettingValue>>;
};

/**
 * The `withSessionSettings` calls enclosing the current async context,
 * outermost first. Lets nested calls restore the enclosing values.
 */
const sessionSettingsStorage = new AsyncLocalStorage<
  readonly SessionSettingsLayer[]
>();

/**
 * Number of `withSessionSettings` calls running on each connection.
 */
const runningCalls = new WeakMap<DuckDBConnection, number>();

export class DuckSettingsManager {
  readonly #conn: DuckDBConnection;
  readonly #logger: Logger;
  readonly #executor: ManagerQueryExecutor;
  readonly className = "DuckSettingsManager";

  constructor(conn: DuckDBConnection, params?: { logger?: Logger }) {
    this.#conn = conn;
    this.#logger =
      params?.logger ??
      sqlduckDefaultLogtapeLogger.with({
        source: this.className,
      });
    this.#executor = new ManagerQueryExecutor(this.#conn, this.className, {
      logger: this.#logger,
    });
  }

  getCurrentSettings = async <T extends string>(
    settings: T[]
  ): Promise<Record<T, string>> => {
    const fnName = `${this.className}.getCurrentSettings`;
    const columns = settings
      .map((s) => `current_setting(${quoteValue(s)}) as ${quoteIdentifier(s)}`)
      .join(",\n");

    const query = `SELECT ${columns}`;

    const rows = await this.#executor.getRowObjectsJS<Record<T, string>>(
      fnName,
      query
    );
    const [firstRow] = rows;
    if (firstRow === undefined) {
      const msg = `Failed to get current settings - no rows returned`;
      this.#logger.error(msg, {
        sql: query,
      });
      throw new Error(msg);
    }
    const currentSettings = {} as Record<T, string>;
    for (const [key, value] of Object.entries(firstRow)) {
      const v = String(value);
      currentSettings[key as T] = v;
    }
    return currentSettings;
  };

  /**
   * Run `fn` with DuckDB settings overridden for this connection only
   * (`SET SESSION`), then restore them, whether `fn` succeeds or not.
   *
   * Only session settings are accepted: global ones (ie: `threads`,
   * `wal_autocheckpoint`) would change every connection of the instance,
   * set them when creating the instance instead.
   *
   * - Restoring uses `RESET SESSION`, which is exact (no rounding of sizes)
   *   but also drops a session override set on the connection before the
   *   call (outside of `withSessionSettings`).
   * - Calls can be nested, an inner call restores the values of the
   *   enclosing one.
   * - Concurrent calls on the same connection are rejected: they would
   *   restore each other's settings. Use a connection per concurrent task.
   *
   * @example
   * ```typescript
   * const settings = new DuckSettingsManager(conn);
   * const result = await settings.withSessionSettings(
   *   { enable_optimistic_write: false, preserve_insertion_order: false },
   *   () => loader.load({ table, schema, rows })
   * );
   * ```
   */
  withSessionSettings = async <T>(
    settings: DuckSessionSettings,
    fn: () => T | Promise<T>
  ): Promise<T> => {
    const conn = this.#conn;
    const enclosingLayers = sessionSettingsStorage.getStore() ?? [];
    const enclosingCalls = enclosingLayers.filter(
      (layer) => layer.conn === conn
    ).length;
    const running = runningCalls.get(conn) ?? 0;
    if (running !== enclosingCalls) {
      throw new Error(
        "withSessionSettings is already running on this connection in another task, concurrent calls would restore each other's settings. Use a connection per concurrent task."
      );
    }

    const entries = Object.entries(settings).filter(
      (entry): entry is [string, DuckSettingValue] => entry[1] !== undefined
    );
    const applied: string[] = [];
    runningCalls.set(conn, running + 1);
    try {
      for (const [name, value] of entries) {
        try {
          await conn.run(
            `SET SESSION ${quoteIdentifier(name)} = ${toSettingLiteral(value)}`
          );
        } catch (error) {
          throw new Error(
            `Failed to set session setting '${name}' - ${getErrorMessage(error)}`,
            { cause: error }
          );
        }
        applied.push(name);
      }
      this.#logger.debug("Applied session settings {settings}", {
        settings,
      });
      const layers = [
        ...enclosingLayers,
        { conn, settings: Object.fromEntries(entries) },
      ];
      return await sessionSettingsStorage.run(layers, fn);
    } finally {
      await this.#restoreSessionSettings(applied.toReversed(), enclosingLayers);
      if (running === 0) {
        runningCalls.delete(conn);
      } else {
        runningCalls.set(conn, running);
      }
    }
  };

  /**
   * Restore each setting to the value of the innermost enclosing
   * `withSessionSettings` call, or reset it. Failures are logged, they must
   * not hide the error of the wrapped function.
   */
  readonly #restoreSessionSettings = async (
    names: readonly string[],
    enclosingLayers: readonly SessionSettingsLayer[]
  ): Promise<void> => {
    for (const name of names) {
      const enclosingValue = enclosingLayers.findLast(
        (layer) => layer.conn === this.#conn && name in layer.settings
      )?.settings[name];
      try {
        await this.#conn.run(
          enclosingValue === undefined
            ? `RESET SESSION ${quoteIdentifier(name)}`
            : `SET SESSION ${quoteIdentifier(name)} = ${toSettingLiteral(enclosingValue)}`
        );
      } catch (error) {
        this.#logger.warning(
          "Failed to restore session setting '{name}' - {errorMessage}",
          { name, errorMessage: getErrorMessage(error) }
        );
      }
    }
  };
}
