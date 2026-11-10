import type { DuckdbDatasource } from "@flowblade/source-duckdb";
import type { SqlTag } from "@flowblade/sql-tag";
import type { Logger } from "@logtape/logtape";

import type { KyselyQueryWithZodSchema } from "../integrations/kysely/kysely-query-with-zod-schema.ts";

/**
 * CSV export options.
 *
 * @example
 * ```typescript
 * const format: CsvExportFormat = {
 *   type: "csv",
 *   header: true,
 *   delimiter: ";",
 *   nullString: "N/A",
 *   timestampFormat: "%Y-%m-%d %H:%M:%S",
 *   compression: "gzip",
 * };
 * ```
 */
export type CsvExportFormat = {
  type: "csv";
  header?: boolean;
  delimiter?: string;
  quote?: string;
  escape?: string;
  nullString?: string;
  /** DuckDB strftime format of DATE columns, ie: `%d/%m/%Y` */
  dateFormat?: string;
  /** DuckDB strftime format of TIMESTAMP columns, ie: `%Y-%m-%d %H:%M:%S` */
  timestampFormat?: string;
  compression?: "none" | "gzip" | "zstd";
};

/**
 * Parquet export options.
 *
 * @example
 * ```typescript
 * const format: ParquetExportFormat = {
 *   type: "parquet",
 *   compression: "zstd",
 *   rowGroupSize: 100_000,
 * };
 * ```
 */
export type ParquetExportFormat = {
  type: "parquet";
  compression?:
    | "uncompressed"
    | "snappy"
    | "gzip"
    | "zstd"
    | "brotli"
    | "lz4"
    | "lz4_raw";
  rowGroupSize?: number;
  preserveOrder?: boolean;
};

/**
 * Excel (XLSX) export options.
 *
 * @example
 * ```typescript
 * const format: ExcelExportFormat = {
 *   type: "excel",
 *   header: true,
 *   sheet: "Users",
 * };
 * ```
 */
export type ExcelExportFormat = {
  type: "excel";
  header?: boolean;
  sheet?: string;
  sheetRowLimit?: number;
};

export type ExportFormat =
  | CsvExportFormat
  | ParquetExportFormat
  | ExcelExportFormat;

export type QueryExporterParams = {
  /** Datasource used to run the export queries. */
  datasource: DuckdbDatasource;
  /**
   * Optional logtape/logger to use for logging export timings and failures.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
};

/**
 * Export a DuckDB query.
 *
 * @example
 * ```typescript
 * await exporter.toFile({
 *   sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
 *   format: { type: "parquet" },
 *   file: "/data/exports/users.parquet",
 * });
 * ```
 */
export type ExportSqlSource = {
  /** Query to export, must be valid as a DuckDB query expression (typically a SELECT). */
  sql: SqlTag<unknown[]>;
  source?: never;
  materialization?: never;
};

/**
 * Export a Kysely query from another database (mssql, postgres...). Its rows
 * are streamed into a temporary DuckDB table, exported, then the table is
 * dropped whatever the outcome.
 *
 * @example
 * ```typescript
 * import { KyselyQueryWithZodSchema } from "@flowblade/sqlduck/kysely";
 * import * as z from "zod";
 *
 * await exporter.toFile({
 *   source: new KyselyQueryWithZodSchema({
 *     query: db.selectFrom("user").select(["id", "name"]),
 *     // Creates the temporary table, must match the selected columns
 *     schema: z.strictObject({ id: z.int32(), name: z.string() }),
 *   }),
 *   format: { type: "parquet" },
 *   file: "/data/exports/users.parquet",
 * });
 * ```
 */
export type ExportKyselySource = {
  /** Kysely query to export, with the zod schema of its rows. */
  source: KyselyQueryWithZodSchema;
  sql?: never;
  /**
   * Where the temporary table is created. Defaults to the connection's
   * current database and schema.
   *
   * @example
   * ```typescript
   * // Keeps large exports out of the in-memory database
   * // (after ATTACH 'scratch.duckdb' AS scratch)
   * materialization: { database: "scratch" }
   * ```
   */
  materialization?: {
    /** ie: an attached file database */
    database?: string;
    /** Must already exist */
    schema?: string;
  };
};

/** Parameters shared by every persistence strategy of a `QueryExporter`. */
export type ExportQueryParams = (ExportSqlSource | ExportKyselySource) & {
  format: ExportFormat;
  /**
   * Rewrite the query in SQL before it is exported, typically by wrapping it
   * to filter, order or add computed columns. Runs inside DuckDB: no row goes
   * through JavaScript. Applied before `selectColumns`. With a Kysely
   * `source`, the query received is a SELECT of its temporary table.
   *
   * @example
   * ```typescript
   * await exporter.toFile({
   *   sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
   *   format: { type: "csv", header: true },
   *   file: "/data/exports/users.csv",
   *   // Adds a column and orders the rows, parameters are preserved
   *   mapQuery: (query) =>
   *     sql`SELECT *, upper(name) AS name_uc FROM (${query}) ORDER BY id`,
   * });
   * ```
   */
  mapQuery?: ExportQueryMapper;
  /**
   * Pick, reorder and rename the exported columns. Keys are the column names
   * of the query (after `mapQuery`), values are their names in the export.
   * Only the listed columns are exported, in the order of the keys (as
   * JavaScript orders object keys: integer-like names such as `"1"` come
   * first).
   *
   * @example
   * ```typescript
   * await exporter.toFile({
   *   sql: sql`SELECT id, name, password FROM user`,
   *   format: { type: "csv", header: true },
   *   file: "/data/exports/users.csv",
   *   // Exports "Name" then "User ID", `password` is dropped
   *   selectColumns: { name: "Name", id: "User ID" },
   * });
   * ```
   */
  selectColumns?: ExportColumnSelection;
  /**
   * Cancels the export.
   *
   * @example
   * ```typescript
   * await exporter.toFile({
   *   sql: sql`SELECT * FROM big_table`,
   *   format: { type: "parquet" },
   *   file: "/data/exports/big.parquet",
   *   signal: AbortSignal.timeout(30_000),
   * });
   * ```
   */
  signal?: AbortSignal;
};

export type ToFileParams = ExportQueryParams & {
  /**
   * Destination file, replaced if it already exists. Its directory must
   * exist. A relative path is resolved from the current working directory.
   */
  file: string;
};

export type ToObjectStorageParams = ExportQueryParams & {
  /**
   * Destination url, replaced if it already exists. Its container or bucket
   * must exist, and a DuckDB secret must give access to it. Supported
   * schemes: `az://`, `azure://`, `abfs://`, `abfss://` (Azure), `s3://`,
   * `gs://`, `gcs://` (Google Cloud Storage) and `r2://` (Cloudflare R2).
   *
   * @example
   * ```typescript
   * const azure = "az://container/2026/users.parquet";
   * const s3 = "s3://bucket/2026/users.parquet";
   * ```
   */
  url: string;
};

export type ToResponseParams = ExportQueryParams & {
  /**
   * Download filename sent in the Content-Disposition header.
   * Defaults to `export.<extension>` (ie: `export.csv`, `export.csv.gz`).
   */
  filename?: string;
  /**
   * Existing directory in which the temporary file backing the response is
   * created. Defaults to `os.tmpdir()`.
   */
  directory?: string;
  /**
   * Additional response headers (ie: Cache-Control). Content-Type,
   * Content-Length and Content-Disposition are always set by the exporter.
   *
   * @example
   * ```typescript
   * const response = await exporter.toResponse({
   *   sql: sql`SELECT id, name FROM user`,
   *   format: { type: "csv" },
   *   headers: { "Cache-Control": "no-store" },
   * });
   * ```
   */
  headers?: HeadersInit;
  /**
   * Maximum time in milliseconds the response body can wait to be read,
   * before its first read as well as between two reads. An unread or stalled
   * response then fails and its temporary file is removed. `Infinity`
   * disables this safety net.
   *
   * @example
   * ```typescript
   * const response = await exporter.toResponse({
   *   sql: sql`SELECT id, name FROM user`,
   *   format: { type: "csv" },
   *   // Slow clients may stall up to 5 minutes between two reads
   *   idleTimeoutMs: 5 * 60_000,
   * });
   * ```
   *
   * @default 60_000
   */
  idleTimeoutMs?: number;
  /**
   * Cancels the query, then the streaming of the response once it is
   * returned: the body fails with the abort reason and its temporary file is
   * removed, whether it was read or not.
   *
   * @example
   * ```typescript
   * // Stops the query and the download when the client disconnects
   * const response = await exporter.toResponse({
   *   sql: sql`SELECT id, name FROM user`,
   *   format: { type: "csv" },
   *   signal: request.signal,
   * });
   * ```
   */
  signal?: AbortSignal;
};

/**
 * Receives the query to export and returns the query to export instead.
 *
 * @example
 * ```typescript
 * const onlyRecent: ExportQueryMapper = (query) =>
 *   sql`SELECT * FROM (${query}) WHERE created_at >= ${"2026-01-01"}`;
 * ```
 */
export type ExportQueryMapper = (query: SqlTag<unknown[]>) => SqlTag<unknown[]>;

/**
 * Maps a column name of the query to its name in the export.
 *
 * @example
 * ```typescript
 * const columns: ExportColumnSelection = { id: "User ID", name: "Name" };
 * ```
 */
export type ExportColumnSelection = Record<string, string>;

/** Description of a file written by `QueryExporter.toFile()`. */
export type ExportedFile = {
  /** Absolute path of the file. */
  path: string;
  /** Name of the file, including its extension. */
  filename: string;
  /** Content-Type of the (uncompressed) format. */
  contentType: string;
  /** Compression applied to the file, when requested in the format. */
  contentEncoding?: "gzip" | "zstd";
  /** File size in bytes. */
  sizeBytes: number;
  /** Number of exported rows. */
  rowCount: number;
  /** Total export time in milliseconds. */
  timeMs: number;
};

/** Description of an object written by `QueryExporter.toObjectStorage()`. */
export type ExportedObject = {
  /** Url of the object, as given. */
  url: string;
  /** Content-Type of the (uncompressed) format. */
  contentType: string;
  /** Compression applied to the object, when requested in the format. */
  contentEncoding?: "gzip" | "zstd";
  /** Number of exported rows. */
  rowCount: number;
  /** Total export time in milliseconds. */
  timeMs: number;
};
