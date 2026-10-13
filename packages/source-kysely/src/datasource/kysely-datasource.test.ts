import { describe, expect, it, vi } from "vitest";

import { KyselyDatasource } from "./kysely-datasource.ts";

const createStreamDatasource = (
  stream: () => AsyncGenerator<{ id: number }>,
  signal?: AbortSignal
) => {
  const logger = {
    debug: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
  };

  const query = {
    compile: vi
      .fn<() => { sql: string; parameters: unknown[] }>()
      .mockReturnValue({
        sql: "SELECT * FROM test",
        parameters: [],
      }),
    stream: vi
      .fn<() => AsyncGenerator<{ id: number }>>()
      .mockImplementation(stream),
  };

  const ds = new KyselyDatasource({
    connection: {} as never, // db is only used for compile which we mocked
    logger: logger as never,
  });

  // @ts-expect-error - access private to mock
  ds.db = { executeQuery: vi.fn<() => void>() };

  return {
    logger,
    query,
    stream: ds.stream(query as never, { name: "test-stream", signal }),
  };
};

const createQueryDatasource = (
  executeQuery: () => Promise<{ rows: unknown[] }>
) => {
  const query = {
    compile: vi
      .fn<() => { sql: string; parameters: unknown[] }>()
      .mockReturnValue({ sql: "SELECT 1", parameters: [] }),
  };

  const ds = new KyselyDatasource({
    connection: {} as never,
    logger: {
      debug: vi.fn<() => void>(),
      info: vi.fn<() => void>(),
      error: vi.fn<() => void>(),
      warn: vi.fn<() => void>(),
    } as never,
  });

  const executeQueryMock = vi
    .fn<() => Promise<{ rows: unknown[] }>>()
    .mockImplementation(executeQuery);
  // @ts-expect-error - access private to mock
  ds.db = { executeQuery: executeQueryMock };

  return { ds, query: query as never, executeQuery: executeQueryMock };
};

describe(KyselyDatasource, () => {
  describe("query", () => {
    it("should keep the driver error as the error cause", async () => {
      const driverError = new Error("Incorrect syntax near 'FROM'.");
      const { ds, query } = createQueryDatasource(() =>
        Promise.reject(driverError)
      );

      const result = await ds.query(query);

      expect(result.error).toStrictEqual({
        message: "Incorrect syntax near 'FROM'.",
        cause: driverError,
      });
      // Never serialized
      expect(result.toJsonifiable().error).toStrictEqual({
        message: "Incorrect syntax near 'FROM'.",
      });
    });

    it("should throw with the driver error as cause in queryOrThrow", async () => {
      const driverError = new Error("Incorrect syntax near 'FROM'.");
      const { ds, query } = createQueryDatasource(() =>
        Promise.reject(driverError)
      );

      await expect(ds.queryOrThrow(query)).rejects.toThrow(
        expect.objectContaining({
          message: "Query failed: Incorrect syntax near 'FROM'.",
          cause: driverError,
        })
      );
    });

    it("should pass the signal to kysely", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(() =>
        Promise.resolve({ rows: [] })
      );
      const { signal } = new AbortController();

      await ds.query(query, { signal });

      expect(executeQuery).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        signal,
      });
    });
  });

  describe("stream", () => {
    it("should pass the chunkSize and signal to kysely", async () => {
      const { signal } = new AbortController();
      const { query, stream } = createStreamDatasource(async function* rows() {
        yield { id: 1 };
      }, signal);

      await Array.fromAsync(stream);

      expect(query.stream).toHaveBeenCalledExactlyOnceWith({
        chunkSize: undefined,
        signal,
      });
    });

    it("should log the execution once the stream is fully consumed", async () => {
      const { logger, stream } = createStreamDatasource(async function* rows() {
        yield { id: 1 };
        yield { id: 2 };
        yield { id: 3 };
      });

      await expect(Array.fromAsync(stream)).resolves.toStrictEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
        expect.objectContaining({ affectedRows: 3 })
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should log the execution even if the stream is partially consumed", async () => {
      const { logger, stream } = createStreamDatasource(async function* rows() {
        yield { id: 1 };
        yield { id: 2 };
        yield { id: 3 };
      });

      // Partially consume the stream
      const first = await stream.next();
      expect(first.value).toStrictEqual({ id: 1 });

      // Stop here and trigger generator return
      expect.assert(typeof stream.return === "function");
      await stream.return();

      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
        expect.objectContaining({ affectedRows: 1 })
      );
    });

    it("should only log the error when the stream fails", async () => {
      const failure = new Error("Connection lost");
      const { logger, stream } = createStreamDatasource(async function* rows() {
        yield { id: 1 };
        throw failure;
      });

      await expect(Array.fromAsync(stream)).rejects.toThrow(
        expect.objectContaining({ message: "Connection lost", cause: failure })
      );

      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Streaming query "{queryName}" failed: {errorMessage}',
        expect.objectContaining({
          queryName: "test-stream",
          errorMessage: "Connection lost",
          affectedRows: 1,
        })
      );
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
