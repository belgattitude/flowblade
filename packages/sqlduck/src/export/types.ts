import type { ReadStream } from "node:fs";

import type { DuckdbDatasource } from "@flowblade/source-duckdb";
import type { SqlTag } from "@flowblade/sql-tag";

export type CsvExportFormat = {
  type: "csv";
  header?: boolean;
  delimiter?: string;
  quote?: string;
  escape?: string;
  nullString?: string;
  dateFormat?: string;
  timestampFormat?: string;
  compression?: "none" | "gzip" | "zstd";
};

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

/**
 * Options shared by every export of a `QueryExporter`. Each of them can be
 * overridden per call in `ExportQueryParams`.
 */
export type QueryExporterDefaults = {
  /**
   * Existing directory in which temporary export files are created.
   * Defaults to `os.tmpdir()`.
   */
  directory?: string;
};

export type QueryExporterParams = QueryExporterDefaults & {
  /** Datasource used to run the export queries. */
  datasource: DuckdbDatasource;
};

export type ExportQueryParams = QueryExporterDefaults & {
  /** Query to export, must be valid as a DuckDB query expression (typically a SELECT). */
  sql: SqlTag<unknown[]>;
  format: ExportFormat;
  /**
   * Rewrite the query in SQL before it is exported, typically by wrapping it
   * to filter, order or add computed columns. Runs inside DuckDB: no row goes
   * through JavaScript. Applied before `selectColumns`.
   *
   * @example
   * ```typescript
   * mapQuery: (query) => sql`SELECT *, upper(name) AS name_uc FROM (${query}) ORDER BY id`
   * ```
   */
  mapQuery?: ExportQueryMapper;
  /**
   * Pick, reorder and rename the exported columns. Keys are the column names
   * of the query (after `mapQuery`), values are their names in the export.
   * Only the listed columns are exported, in the order of the keys.
   *
   * @example
   * ```typescript
   * selectColumns: { id: "User ID", name: "Name" }
   * ```
   */
  selectColumns?: ExportColumnSelection;
  signal?: AbortSignal;
};

/** Receives the query to export and returns the query to export instead. */
export type ExportQueryMapper = (query: SqlTag<unknown[]>) => SqlTag<unknown[]>;

/** Maps a column name of the query to its name in the export. */
export type ExportColumnSelection = Record<string, string>;

export type ExportArtifact = {
  /** Randomly generated filename, including its format extension. */
  filename: string;
  /** Absolute path to the completed export file. */
  path: string;
  /** Suggested Content-Type for an HTTP response. */
  contentType: string;
  /** Suggested Content-Encoding for an HTTP response, when the file is compressed. */
  contentEncoding?: "gzip" | "zstd";
  /** Suggested Content-Disposition value for an HTTP response. */
  contentDisposition: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Open a stream over the completed file. */
  openStream: (options?: { signal?: AbortSignal }) => ReadStream;
  /** Close open streams and remove the temporary export directory. */
  dispose: () => Promise<void>;
};
