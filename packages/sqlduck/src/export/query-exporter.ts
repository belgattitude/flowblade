import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { DuckdbDatasource } from "@flowblade/source-duckdb";

import {
  compileCopyQuery,
  getFormatInfo,
  validateFormat,
} from "./export-format.ts";
import { LocalExportArtifact } from "./local-export-artifact.ts";
import type {
  ExportArtifact,
  ExportQueryParams,
  QueryExporterParams,
} from "./types.ts";

const assertDirectory = (directory: string): string => {
  if (directory.trim().length === 0) {
    throw new Error("directory must be a non-empty path");
  }
  return directory;
};

/**
 * Remove a directory, returning the failure message instead of throwing.
 */
const removeDirectory = async (directory: string): Promise<string | null> => {
  try {
    await rm(directory, { recursive: true, force: true });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/**
 * Export parameterized DuckDB queries to temporary local files.
 *
 * Options given to the constructor (like `directory`) apply to every export
 * and can be overridden per call.
 *
 * @example
 * ```typescript
 * const exporter = new QueryExporter({
 *   datasource: new DuckdbDatasource({ connection: conn }),
 *   directory: "/var/tmp/exports",
 * });
 *
 * const artifact = await exporter.export({
 *   sql: sql`SELECT id, name FROM user WHERE active = ${true}`,
 *   format: { type: "csv", header: true },
 * });
 * try {
 *   await pipeline(artifact.openStream(), response);
 * } finally {
 *   await artifact.dispose();
 * }
 * ```
 */
export class QueryExporter {
  readonly #datasource: DuckdbDatasource;
  readonly #directory: string;

  constructor(params: QueryExporterParams) {
    this.#datasource = params.datasource;
    this.#directory = assertDirectory(params.directory ?? os.tmpdir());
  }

  /**
   * Export a query to a uniquely named temporary file and return an artifact
   * over the completed file. Always `dispose()` the artifact when done.
   *
   * XLSX export uses DuckDB's Excel extension, which may need to be downloaded
   * the first time it is used.
   */
  export = async (params: ExportQueryParams): Promise<ExportArtifact> => {
    const { sql, format, mapQuery, selectColumns, signal } = params;
    validateFormat(format);
    const directory = assertDirectory(params.directory ?? this.#directory);
    signal?.throwIfAborted();

    const { extension, contentType, contentEncoding } = getFormatInfo(format);
    const temporaryDirectory = await mkdtemp(
      path.join(path.resolve(directory), "flowblade-sqlduck-export-")
    );
    // Web standard Crypto API (cryptographically secure, unguessable name)
    const filename = `${globalThis.crypto.randomUUID()}.${extension}`;
    const outputPath = path.join(temporaryDirectory, filename);

    try {
      if (format.type === "excel") {
        await this.#loadExcelExtension(signal);
      }
      await this.#datasource.queryOrThrow(
        compileCopyQuery(
          mapQuery === undefined ? sql : mapQuery(sql),
          format,
          outputPath,
          selectColumns
        ),
        { name: "sqlduck.export", signal }
      );
      signal?.throwIfAborted();
      const { size } = await stat(outputPath);
      return new LocalExportArtifact({
        filename,
        path: outputPath,
        contentType,
        contentEncoding,
        sizeBytes: size,
        directory: temporaryDirectory,
      });
    } catch (error) {
      // The export error stays the cause, the cleanup failure is only reported
      const cleanupFailure = await removeDirectory(temporaryDirectory);
      if (cleanupFailure !== null) {
        throw new Error(
          `Export failed and its temporary directory could not be removed: ${cleanupFailure}`,
          { cause: error }
        );
      }
      throw error;
    }
  };

  /**
   * DuckDB does not autoload the excel extension for `COPY ... (FORMAT XLSX)`.
   * Both statements are no-ops once the extension is installed and loaded.
   */
  readonly #loadExcelExtension = async (
    signal: AbortSignal | undefined
  ): Promise<void> => {
    for (const text of ["INSTALL excel", "LOAD excel"]) {
      await this.#datasource.queryOrThrow(
        { text, values: [] },
        { name: "sqlduck.export.extension", signal }
      );
    }
  };
}
