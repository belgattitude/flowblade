import { mkdtemp, rename, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { DuckdbDatasource } from "@flowblade/source-duckdb";
import { sql as sqlTag, type SqlTag } from "@flowblade/sql-tag";
import type { Logger } from "@logtape/logtape";

import {
  createMaterializedTable,
  dropTableQuietly,
  getInvalidMaterializationTarget,
  loadKyselyQueryIntoTable,
} from "../integrations/kysely/materialize-kysely-query.ts";
import { sqlduckDefaultLogtapeLogger } from "../logger/sqlduck-default-logtape-logger.ts";
import { getErrorMessage } from "../utils/get-error-message.ts";
import { createAttachmentDisposition } from "./content-disposition.ts";
import {
  compileCopyQuery,
  getFormatInfo,
  validateFormat,
} from "./export-format.ts";
import {
  createTemporaryFileStream,
  type TemporaryFileStreamOutcome,
} from "./temporary-file-stream.ts";
import type {
  ExportedFile,
  ExportedObject,
  ExportQueryParams,
  QueryExporterParams,
  ToFileParams,
  ToObjectStorageParams,
  ToResponseParams,
} from "./types.ts";

const assertPath = (name: string, value: string): string => {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty path`);
  }
  return value;
};

/**
 * Remove a file or directory, returning the failure message instead of throwing.
 */
const removePath = async (target: string): Promise<string | null> => {
  try {
    await rm(target, { recursive: true, force: true });
    return null;
  } catch (error) {
    return getErrorMessage(error);
  }
};

/**
 * Text of the exported query for the logs, without its parameter values.
 */
const getQueryText = (params: ExportQueryParams): string => {
  if (params.source === undefined) {
    return params.sql.text;
  }
  try {
    return params.source.getQuery().compile().sql;
  } catch {
    return "(kysely source)";
  }
};

const elapsedMs = (since: number): number =>
  Math.round(performance.now() - since);

// A compressed export is downloaded as is: no Content-Encoding is sent, the
// browser would otherwise decompress a file named `.gz` / `.zst`.
const compressedContentTypes = {
  gzip: "application/gzip",
  zstd: "application/zstd",
} as const;

const DEFAULT_IDLE_TIMEOUT_MS = 60_000;

// DuckDB extension handling each object storage url scheme
const objectStorageExtensions = {
  az: "azure",
  azure: "azure",
  abfs: "azure",
  abfss: "azure",
  s3: "httpfs",
  gs: "httpfs",
  gcs: "httpfs",
  r2: "httpfs",
} as const;

const getObjectStorageExtension = (url: string): "azure" | "httpfs" => {
  const scheme = /^([a-z][\da-z]*):\/\/./i.exec(url)?.[1]?.toLowerCase();
  if (scheme !== undefined && Object.hasOwn(objectStorageExtensions, scheme)) {
    return objectStorageExtensions[
      scheme as keyof typeof objectStorageExtensions
    ];
  }
  throw new Error(
    `url must be an object storage url (${Object.keys(objectStorageExtensions)
      .map((supported) => `${supported}://`)
      .join(", ")}), use toFile() for local files`
  );
};

const responseOutcomeLogLevels = {
  completed: "debug",
  cancelled: "debug",
  aborted: "warning",
  timeout: "warning",
  failed: "error",
} as const satisfies Record<TemporaryFileStreamOutcome, string>;

/**
 * Export parameterized DuckDB queries, with one method per persistence
 * strategy: `toFile()` writes a local file you own, `toObjectStorage()`
 * uploads to Azure Blob Storage, S3, GCS or R2 and `toResponse()` returns a
 * web `Response` streaming a temporary file removed once sent.
 *
 * The exports run as a DuckDB `COPY`: rows never go through JavaScript. The
 * query is a DuckDB one (`sql`), or a Kysely query of another database
 * (`source`) materialized in a temporary DuckDB table for the export.
 *
 * @example
 * ```typescript
 * import { DuckDBInstance } from "@duckdb/node-api";
 * import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
 * import { QueryExporter } from "@flowblade/sqlduck/export";
 *
 * const instance = await DuckDBInstance.create(":memory:");
 * const conn = await instance.connect();
 * const exporter = new QueryExporter({
 *   datasource: new DuckdbDatasource({ connection: conn }),
 * });
 * const query = sql`SELECT id, name FROM user WHERE active = ${true}`;
 *
 * // A local file you own
 * const file = await exporter.toFile({
 *   sql: query,
 *   format: { type: "parquet" },
 *   file: "/data/exports/users.parquet",
 * });
 *
 * // An object in Azure Blob Storage, S3, GCS or R2
 * const object = await exporter.toObjectStorage({
 *   sql: query,
 *   format: { type: "parquet" },
 *   url: "az://exports/users.parquet",
 * });
 *
 * // A download, streamed from a temporary file removed once sent
 * const response = await exporter.toResponse({
 *   sql: query,
 *   format: { type: "csv", header: true },
 *   filename: "users.csv",
 * });
 * ```
 */
export class QueryExporter {
  readonly #datasource: DuckdbDatasource;
  readonly #logger: Logger;
  // Extensions already installed and loaded through this exporter
  readonly #ensuredExtensions = new Set<string>();

  constructor(params: QueryExporterParams) {
    this.#datasource = params.datasource;
    this.#logger = params.logger ?? sqlduckDefaultLogtapeLogger;
  }

  /**
   * Export a query to the given file, replacing it if it exists. The export
   * is written next to the destination and renamed once complete: a failed
   * export leaves no partial file and keeps an existing file untouched.
   *
   * XLSX export uses DuckDB's Excel extension, which may need to be downloaded
   * the first time it is used.
   *
   * @example
   * ```typescript
   * const file = await exporter.toFile({
   *   sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
   *   format: { type: "csv", header: true, compression: "gzip" },
   *   file: "/data/exports/users.csv.gz",
   * });
   *
   * console.log(file.path); // "/data/exports/users.csv.gz"
   * console.log(file.rowCount, file.sizeBytes, file.timeMs);
   * ```
   */
  toFile = async (params: ToFileParams): Promise<ExportedFile> => {
    const timeStart = performance.now();
    const { format, signal } = params;
    validateFormat(format);
    const filePath = path.resolve(assertPath("file", params.file));
    const filename = path.basename(filePath);
    signal?.throwIfAborted();

    // Keeps the extension: DuckDB may infer the CSV compression from it
    const partialPath = path.join(
      path.dirname(filePath),
      `.${globalThis.crypto.randomUUID()}-${filename}`
    );

    try {
      const { sizeBytes, rowCount, queryTimeMs } = await this.#copyTo(
        partialPath,
        params
      );
      await rename(partialPath, filePath);
      const timeMs = elapsedMs(timeStart);
      this.#logger.info(
        "Exported query to {format} file '{path}' ({sizeBytes} bytes) in {timeMs}ms",
        {
          format: format.type,
          path: filePath,
          sizeBytes,
          rowCount,
          queryTimeMs,
          timeMs,
        }
      );
      const { contentType, contentEncoding } = getFormatInfo(format);
      return {
        path: filePath,
        filename,
        contentType,
        ...(contentEncoding === undefined ? {} : { contentEncoding }),
        sizeBytes,
        rowCount,
        timeMs,
      };
    } catch (error) {
      this.#logFailure(error, params, timeStart);
      throw await this.#withCleanup(error, partialPath);
    }
  };

  /**
   * Export a query directly to object storage: Azure Blob Storage (`az://`,
   * `abfss://`), S3 (`s3://`), Google Cloud Storage (`gs://`) or Cloudflare
   * R2 (`r2://`). DuckDB uploads the export itself: nothing is written
   * locally. An existing object is replaced, and its container or bucket
   * must exist.
   *
   * Credentials are not given here: DuckDB uses the secret whose scope
   * matches the url, see `DuckSecretsManager`.
   *
   * @example
   * ```typescript
   * await new DuckSecretsManager(conn).create({
   *   name: "exports_azure",
   *   type: "azure",
   *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
   *   scope: "az://exports/",
   * });
   *
   * const exported = await exporter.toObjectStorage({
   *   sql: sql`SELECT id, name FROM user`,
   *   format: { type: "parquet" },
   *   url: "az://exports/2026/users.parquet",
   * });
   *
   * console.log(exported.url, exported.rowCount, exported.timeMs);
   * ```
   */
  toObjectStorage = async (
    params: ToObjectStorageParams
  ): Promise<ExportedObject> => {
    const timeStart = performance.now();
    const { format, signal, url } = params;
    validateFormat(format);
    const extension = getObjectStorageExtension(url);
    // Urls may carry credentials in their query string (ie: s3 url params)
    const loggedUrl = url.split("?", 1)[0] ?? url;
    signal?.throwIfAborted();

    try {
      await this.#ensureExtension(extension, signal);
      const { rowCount, queryTimeMs } = await this.#copy(url, params);
      const timeMs = elapsedMs(timeStart);
      this.#logger.info(
        "Exported query to {format} object '{url}' ({rowCount} rows) in {timeMs}ms",
        { format: format.type, url: loggedUrl, rowCount, queryTimeMs, timeMs }
      );
      const { contentType, contentEncoding } = getFormatInfo(format);
      return {
        url,
        contentType,
        ...(contentEncoding === undefined ? {} : { contentEncoding }),
        rowCount,
        timeMs,
      };
    } catch (error) {
      this.#logFailure(error, params, timeStart);
      throw error;
    }
  };

  /**
   * Export a query to a temporary file and return a web `Response` streaming
   * it as a download. The temporary file is removed when the body has been
   * fully read, is cancelled (ie: the client disconnects) or fails.
   *
   * As a safety net, a response left unread for `idleTimeoutMs` (60 seconds
   * by default) fails and its temporary file is removed as well.
   *
   * The query runs before the response is returned: a failing query rejects
   * instead of producing a broken download.
   *
   * @example
   * ```typescript
   * // Web standard handlers: Hono, Next.js route handlers, Bun, Deno...
   * export const GET = async (request: Request): Promise<Response> =>
   *   await exporter.toResponse({
   *     sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
   *     format: { type: "csv", header: true },
   *     filename: "users.csv",
   *     headers: { "Cache-Control": "no-store" },
   *     signal: request.signal,
   *   });
   * ```
   *
   * @example
   * ```typescript
   * // node:http, Express...
   * import { Readable } from "node:stream";
   * import { pipeline } from "node:stream/promises";
   *
   * app.get("/users.xlsx", async (req, res) => {
   *   const response = await exporter.toResponse({
   *     sql: sql`SELECT id, name FROM user`,
   *     format: { type: "excel", header: true, sheet: "Users" },
   *     filename: "users.xlsx",
   *   });
   *   res.writeHead(response.status, Object.fromEntries(response.headers));
   *   await pipeline(Readable.fromWeb(response.body), res);
   * });
   * ```
   */
  toResponse = async (params: ToResponseParams): Promise<Response> => {
    const timeStart = performance.now();
    const { format, signal } = params;
    validateFormat(format);
    const directory = assertPath("directory", params.directory ?? os.tmpdir());
    const { extension, contentType, contentEncoding } = getFormatInfo(format);
    const filename = assertPath(
      "filename",
      params.filename ?? `export.${extension}`
    );
    const idleTimeoutMs = params.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    if (!(idleTimeoutMs > 0)) {
      throw new RangeError("idleTimeoutMs must be a positive number");
    }
    signal?.throwIfAborted();

    const temporaryDirectory = await mkdtemp(
      path.join(path.resolve(directory), "flowblade-sqlduck-export-")
    );
    // Web standard Crypto API (cryptographically secure, unguessable name)
    const temporaryPath = path.join(
      temporaryDirectory,
      `${globalThis.crypto.randomUUID()}.${extension}`
    );

    try {
      const { sizeBytes, queryTimeMs } = await this.#copyTo(
        temporaryPath,
        params
      );

      const headers = new Headers(params.headers);
      headers.set(
        "Content-Type",
        contentEncoding === undefined
          ? contentType
          : compressedContentTypes[contentEncoding]
      );
      headers.set("Content-Length", String(sizeBytes));
      headers.set("Content-Disposition", createAttachmentDisposition(filename));

      const streamTimeStart = performance.now();
      const body = createTemporaryFileStream({
        filePath: temporaryPath,
        sizeBytes,
        idleTimeoutMs,
        signal,
        onClose: async (outcome) => {
          await this.#removeResponseFile({
            temporaryDirectory,
            filename,
            outcome,
            streamTimeStart,
          });
        },
      });

      this.#logger.info(
        "Exported query to a {format} response ({sizeBytes} bytes) in {timeMs}ms",
        {
          format: format.type,
          filename,
          path: temporaryPath,
          sizeBytes,
          queryTimeMs,
          timeMs: elapsedMs(timeStart),
        }
      );
      return new Response(body, { headers });
    } catch (error) {
      this.#logFailure(error, params, timeStart);
      throw await this.#withCleanup(error, temporaryDirectory);
    }
  };

  /**
   * Run the COPY statement writing the query to a local path.
   */
  readonly #copyTo = async (
    outputPath: string,
    params: ExportQueryParams
  ): Promise<{ sizeBytes: number; rowCount: number; queryTimeMs: number }> => {
    const copied = await this.#copy(outputPath, params);
    const { size } = await stat(outputPath);
    return { sizeBytes: size, ...copied };
  };

  /**
   * Run the COPY statement writing the query to a local path or a url.
   */
  readonly #copy = async (
    output: string,
    params: ExportQueryParams
  ): Promise<{ rowCount: number; queryTimeMs: number }> => {
    const { format, mapQuery, selectColumns, signal } = params;
    if (format.type === "excel") {
      await this.#ensureExtension("excel", signal);
    }
    const source = await this.#openSource(params);
    try {
      const queryTimeStart = performance.now();
      const { data } = await this.#datasource.queryOrThrow<
        { Count?: unknown }[]
      >(
        compileCopyQuery(
          mapQuery === undefined ? source.sql : mapQuery(source.sql),
          format,
          output,
          selectColumns
        ),
        { name: "sqlduck.export", signal }
      );
      const queryTimeMs = elapsedMs(queryTimeStart);
      signal?.throwIfAborted();
      return { rowCount: Number(data[0]?.Count ?? 0), queryTimeMs };
    } finally {
      await source.release();
    }
  };

  /**
   * Return the DuckDB query to export: the given one, or a SELECT of the
   * temporary table a Kysely source is materialized into. `release` drops
   * that table.
   */
  readonly #openSource = async (
    params: ExportQueryParams
  ): Promise<{ sql: SqlTag<unknown[]>; release: () => Promise<void> }> => {
    if (params.source === undefined) {
      return { sql: params.sql, release: () => Promise.resolve() };
    }
    const { source, materialization, signal } = params;
    const invalidTarget = getInvalidMaterializationTarget(
      materialization ?? {}
    );
    if (invalidTarget !== null) {
      throw new Error(invalidTarget);
    }
    const materializedTable = createMaterializedTable(materialization ?? {});
    const tableName = materializedTable.getFullName();
    const release = async (): Promise<void> => {
      await dropTableQuietly(this.#datasource, materializedTable);
    };
    try {
      const loaded = await loadKyselyQueryIntoTable({
        dsDuck: this.#datasource,
        table: source,
        materializedTable,
        signal,
      });
      this.#logger.debug(
        "Materialized kysely source into table '{table}' ({rowCount} rows) in {timeMs}ms",
        { table: tableName, rowCount: loaded.totalRows, timeMs: loaded.timeMs }
      );
    } catch (error) {
      // The table may have been partially created
      await release();
      throw new Error(
        `Can't materialize kysely source into table ${tableName} - ${getErrorMessage(error)}`,
        { cause: error }
      );
    }
    // The name is generated (validated identifier)
    return { sql: sqlTag`SELECT * FROM ${sqlTag.raw(tableName)}`, release };
  };

  /**
   * DuckDB does not autoload the extension of a COPY format or of a target
   * url. Both statements are no-ops once the extension is installed and
   * loaded.
   */
  readonly #ensureExtension = async (
    extension: "excel" | "azure" | "httpfs",
    signal: AbortSignal | undefined
  ): Promise<void> => {
    if (this.#ensuredExtensions.has(extension)) {
      return;
    }
    const timeStart = performance.now();
    for (const text of [`INSTALL ${extension}`, `LOAD ${extension}`]) {
      await this.#datasource.queryOrThrow(
        { text, values: [] },
        { name: "sqlduck.export.extension", signal }
      );
    }
    this.#ensuredExtensions.add(extension);
    this.#logger.debug("Loaded DuckDB {extension} extension in {timeMs}ms", {
      extension,
      timeMs: elapsedMs(timeStart),
    });
  };

  readonly #logFailure = (
    error: unknown,
    params: ExportQueryParams,
    timeStart: number
  ): void => {
    const { format, signal } = params;
    // The datasource wraps the abort reason (QAbortedError)
    if (signal?.aborted === true) {
      this.#logger.warning(
        "Aborted export of query to {format} after {timeMs}ms",
        { format: format.type, timeMs: elapsedMs(timeStart) }
      );
      return;
    }
    // Only the query text is logged: parameter values may be sensitive
    this.#logger.error(
      "Failed to export query to {format} after {timeMs}ms - {errorMessage}",
      {
        format: format.type,
        sql: getQueryText(params),
        timeMs: elapsedMs(timeStart),
        errorMessage: getErrorMessage(error),
      }
    );
  };

  /**
   * Remove what a failed export left behind and return the error to throw:
   * the export error, which stays the cause when the cleanup fails as well.
   */
  readonly #withCleanup = async (
    error: unknown,
    target: string
  ): Promise<unknown> => {
    const cleanupFailure = await removePath(target);
    if (cleanupFailure === null) {
      return error;
    }
    this.#logger.error(
      "Failed to remove export path '{path}' - {errorMessage}",
      { path: target, errorMessage: cleanupFailure }
    );
    return new Error(
      `Export failed and '${target}' could not be removed: ${cleanupFailure}`,
      { cause: error }
    );
  };

  readonly #removeResponseFile = async (params: {
    temporaryDirectory: string;
    filename: string;
    outcome: TemporaryFileStreamOutcome;
    streamTimeStart: number;
  }): Promise<void> => {
    const { temporaryDirectory, filename, outcome, streamTimeStart } = params;
    const cleanupFailure = await removePath(temporaryDirectory);
    if (cleanupFailure !== null) {
      this.#logger.error(
        "Failed to remove export path '{path}' - {errorMessage}",
        { path: temporaryDirectory, errorMessage: cleanupFailure }
      );
    }
    this.#logger[responseOutcomeLogLevels[outcome]](
      "Closed response '{filename}' ({outcome}) after {streamTimeMs}ms",
      {
        filename,
        outcome,
        path: temporaryDirectory,
        streamTimeMs: elapsedMs(streamTimeStart),
      }
    );
  };
}
