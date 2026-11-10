import { createReadStream, type ReadStream } from "node:fs";
import { rm } from "node:fs/promises";

import type { ExportArtifact } from "./types.ts";

export class LocalExportArtifact implements ExportArtifact {
  readonly filename: string;
  readonly path: string;
  readonly contentType: string;
  readonly contentEncoding: "gzip" | "zstd" | undefined;
  readonly contentDisposition: string;
  readonly sizeBytes: number;
  readonly #directory: string;
  readonly #streams = new Set<ReadStream>();
  #disposed = false;
  #disposePromise: Promise<void> | undefined;

  constructor(params: {
    filename: string;
    path: string;
    contentType: string;
    contentEncoding?: "gzip" | "zstd" | undefined;
    sizeBytes: number;
    /** Temporary directory owning the file, removed on dispose. */
    directory: string;
  }) {
    this.filename = params.filename;
    this.path = params.path;
    this.contentType = params.contentType;
    this.contentEncoding = params.contentEncoding;
    this.contentDisposition = `attachment; filename="${params.filename}"`;
    this.sizeBytes = params.sizeBytes;
    this.#directory = params.directory;
  }

  openStream = (options?: { signal?: AbortSignal }): ReadStream => {
    if (this.#disposed) {
      throw new Error("Export artifact has been disposed");
    }
    const stream =
      options?.signal === undefined
        ? createReadStream(this.path)
        : createReadStream(this.path, { signal: options.signal });
    this.#streams.add(stream);
    stream.once("close", () => {
      this.#streams.delete(stream);
    });
    return stream;
  };

  dispose = async (): Promise<void> => {
    if (this.#disposePromise !== undefined) {
      return await this.#disposePromise;
    }
    this.#disposed = true;
    this.#disposePromise = (async () => {
      const streams = [...this.#streams];
      const closed = streams.map((stream) => {
        if (stream.closed) {
          return Promise.resolve();
        }
        const { promise, resolve } = Promise.withResolvers<undefined>();
        stream.once("close", () => resolve(undefined));
        return promise;
      });
      for (const stream of streams) {
        stream.destroy();
      }
      await Promise.all(closed);
      await rm(this.#directory, { recursive: true, force: true });
    })();
    return await this.#disposePromise;
  };
}
