import type { DuckDBConnection } from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";

import { sqlduckDefaultLogtapeLogger } from "../../logger/sqlduck-default-logtape-logger.ts";
import { getErrorMessage } from "../../utils/get-error-message.ts";
import { quoteValue } from "../../utils/quote-value.ts";
import { ManagerQueryExecutor } from "../core/manager-query-executor.ts";
import type {
  CreateSecretParams,
  DuckSecret,
  DuckSecretInfo,
  DuckSecretOptionValue,
} from "./duck-secrets.types.ts";

// Secret names, types, providers and option names are identifiers
const identifierRegexp = /^[a-z_][a-z0-9_]*$/i;

const assertIdentifier = (label: string, value: string): string => {
  if (!identifierRegexp.test(value)) {
    throw new Error(`Invalid secret ${label} '${value}'`);
  }
  return value;
};

/** `connectionString` -> `CONNECTION_STRING` */
const toOptionName = (key: string): string =>
  assertIdentifier(
    "option",
    key.replaceAll(/[A-Z]/g, (letter) => `_${letter}`)
  ).toUpperCase();

// Keys of a secret that are not options of its type
const nonOptionKeys = new Set([
  "name",
  "type",
  "customType",
  "provider",
  "scope",
  "options",
]);

const secretColumns = `name, type, provider, persistent, storage, scope, secret_string AS "secretString"`;

/**
 * Manage the DuckDB secrets giving access to object storage (Azure, S3, GCS,
 * R2) or http endpoints.
 *
 * @example
 * ```typescript
 * import { DuckDBInstance } from "@duckdb/node-api";
 * import { DuckSecretsManager } from "@flowblade/sqlduck";
 *
 * const instance = await DuckDBInstance.create(":memory:");
 * const conn = await instance.connect();
 * const secrets = new DuckSecretsManager(conn);
 *
 * await secrets.create({
 *   name: "exports_azure",
 *   type: "azure",
 *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
 *   scope: "az://exports/",
 * });
 *
 * await conn.run(
 *   "COPY (SELECT 1 AS id) TO 'az://exports/one.parquet' (FORMAT PARQUET)"
 * );
 * ```
 */
export class DuckSecretsManager {
  readonly #conn: DuckDBConnection;
  readonly #logger: Logger;
  readonly #executor: ManagerQueryExecutor;
  readonly className = "DuckSecretsManager";

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

  /**
   * Create a secret. Secrets belong to the DuckDB instance: they are visible
   * to all its connections, not only to the one of this manager.
   *
   * Option values are bound as query parameters: they are never part of the
   * statement, which is the only thing logged when the creation fails.
   *
   * @example
   * ```typescript
   * await secrets.create({
   *   name: "exports_azure",
   *   type: "azure",
   *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
   *   scope: "az://exports/",
   * });
   *
   * // Without keys: managed identity, cli, env...
   * await secrets.create({
   *   name: "lake_azure",
   *   type: "azure",
   *   provider: "credential_chain",
   *   accountName: "mylake",
   * });
   *
   * // S3 keys, replacing the secret if it exists
   * await secrets.create(
   *   {
   *     name: "exports_s3",
   *     type: "s3",
   *     keyId: process.env.AWS_ACCESS_KEY_ID,
   *     secret: process.env.AWS_SECRET_ACCESS_KEY,
   *     region: "eu-west-1",
   *     scope: "s3://exports/",
   *   },
   *   { onConflict: "replace" }
   * );
   * ```
   */
  create = async (
    secret: DuckSecret,
    params?: CreateSecretParams
  ): Promise<true> => {
    const { persistent = false, onConflict = "error" } = params ?? {};
    const name = assertIdentifier("name", secret.name);
    const type = assertIdentifier(
      "type",
      secret.type === "custom" ? secret.customType : secret.type
    );

    const values: DuckSecretOptionValue[] = [];
    const clauses = [`TYPE ${type}`];
    if (secret.provider !== undefined) {
      clauses.push(`PROVIDER ${assertIdentifier("provider", secret.provider)}`);
    }
    const options = new Map<string, DuckSecretOptionValue>();
    for (const [key, value] of [
      ...Object.entries(secret).filter(([key]) => !nonOptionKeys.has(key)),
      ...Object.entries(secret.options ?? {}),
    ]) {
      if (value !== undefined) {
        options.set(toOptionName(key), value as DuckSecretOptionValue);
      }
    }
    for (const [optionName, value] of options) {
      values.push(value);
      clauses.push(`${optionName} $${values.length}`);
    }
    if (secret.scope !== undefined) {
      const scopes =
        typeof secret.scope === "string" ? [secret.scope] : secret.scope;
      clauses.push(
        `SCOPE [${scopes.map((scope) => quoteValue(scope)).join(", ")}]`
      );
    }

    await this.#executor.getRowObjectsJS(
      "create",
      [
        "CREATE",
        onConflict === "replace" ? "OR REPLACE" : "",
        persistent ? "PERSISTENT" : "TEMPORARY",
        "SECRET",
        onConflict === "ignore" ? "IF NOT EXISTS" : "",
        `${name} (${clauses.join(", ")})`,
      ]
        .filter(Boolean)
        .join(" "),
      values
    );
    return true;
  };

  /**
   * Drop a secret.
   *
   * @example
   * ```typescript
   * await secrets.drop("exports_azure");
   * // Don't fail when it does not exist
   * await secrets.drop("exports_azure", { ifExists: true });
   * ```
   */
  drop = async (
    name: string,
    params?: {
      /** Don't fail when the secret does not exist */
      ifExists?: boolean;
    }
  ): Promise<true> => {
    const { ifExists = false } = params ?? {};
    await this.#executor.getRowObjectsJS(
      "drop",
      `DROP SECRET ${ifExists ? "IF EXISTS " : ""}${assertIdentifier("name", name)}`
    );
    return true;
  };

  /**
   * List the secrets of the DuckDB instance. Sensitive values are redacted
   * by DuckDB.
   *
   * @example
   * ```typescript
   * const azureSecrets = await secrets.list({ type: "azure" });
   * // [{
   * //   name: "exports_azure", type: "azure", provider: "config",
   * //   persistent: false, storage: "memory", scope: ["az://exports/"],
   * //   secretString: "name=exports_azure;...;connection_string=redacted",
   * // }]
   * ```
   */
  list = async (filters?: {
    name?: string;
    type?: string;
  }): Promise<DuckSecretInfo[]> => {
    const { name, type } = filters ?? {};
    const conditions = [
      name === undefined ? "" : `name = ${quoteValue(name)}`,
      type === undefined ? "" : `type = ${quoteValue(type)}`,
    ].filter(Boolean);
    return await this.#executor.getRowObjectsJS<DuckSecretInfo>(
      "list",
      `SELECT ${secretColumns}
       FROM duckdb_secrets()
       ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY name`
    );
  };

  /**
   * Return the secret DuckDB would use for a path, or null. Useful to check
   * the scopes when several secrets of a type exist.
   *
   * @example
   * ```typescript
   * const secret = await secrets.which("az://exports/users.parquet", "azure");
   * console.log(secret?.name); // "exports_azure", or undefined without match
   * ```
   */
  which = async (
    path: string,
    type: string
  ): Promise<DuckSecretInfo | null> => {
    const rows = await this.#executor.getRowObjectsJS<DuckSecretInfo>(
      "which",
      `SELECT ${secretColumns}
       FROM duckdb_secrets()
       WHERE name IN (SELECT name FROM which_secret($1, $2))`,
      [path, type]
    );
    return rows[0] ?? null;
  };

  /**
   * Run a function with a temporary secret, dropped when the function
   * completes or throws. The name is generated unless given.
   *
   * The secret is visible to all the connections of the DuckDB instance
   * while the function runs: give it a `scope` to limit what it applies to.
   *
   * @example
   * ```typescript
   * const exported = await secrets.withSecret(
   *   {
   *     type: "azure",
   *     connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
   *     scope: "az://exports/",
   *   },
   *   async (secretName) =>
   *     await exporter.toObjectStorage({
   *       sql: sql`SELECT id, name FROM user`,
   *       format: { type: "parquet" },
   *       url: "az://exports/users.parquet",
   *     })
   * );
   * ```
   */
  withSecret = async <T>(
    secret: DuckSecret extends infer TSecret
      ? TSecret extends DuckSecret
        ? Omit<TSecret, "name"> & { name?: string }
        : never
      : never,
    fn: (name: string) => Promise<T> | T
  ): Promise<T> => {
    const name =
      secret.name ??
      `flowblade_tmp_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
    await this.create({ ...secret, name });
    try {
      return await fn(name);
    } finally {
      try {
        await this.drop(name, { ifExists: true });
      } catch (error) {
        this.#logger.warning(
          "Failed to drop temporary secret '{name}' - {errorMessage}",
          { name, errorMessage: getErrorMessage(error) }
        );
      }
    }
  };
}
