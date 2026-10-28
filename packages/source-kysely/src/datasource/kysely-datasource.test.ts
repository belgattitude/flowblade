import { describe, expect, it, vi } from "vitest";

import type { KyselyDatasourceDefaultOptions } from "../index.ts";
import { QErrors } from "../index.ts";
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
  executeQuery: () => Promise<{ rows: unknown[] }>,
  params?: Pick<
    ConstructorParameters<typeof KyselyDatasource>[0],
    "defaultOptions" | "inflightQueryAbortStrategy"
  >
) => {
  const query = {
    compile: vi
      .fn<() => { sql: string; parameters: unknown[] }>()
      .mockReturnValue({ sql: "SELECT 1", parameters: [] }),
  };

  const logger = {
    debug: vi.fn<(message: string, properties?: unknown) => void>(),
    info: vi.fn<(message: string, properties?: unknown) => void>(),
    error: vi.fn<(message: string, properties?: unknown) => void>(),
    warn: vi.fn<(message: string, properties?: unknown) => void>(),
  };
  const ds = new KyselyDatasource({
    connection: {} as never,
    ...params,
    logger: logger as never,
  });

  const executeQueryMock = vi
    .fn<() => Promise<{ rows: unknown[] }>>()
    .mockImplementation(executeQuery);
  // @ts-expect-error - access private to mock
  ds.db = { executeQuery: executeQueryMock };

  return {
    ds,
    logger,
    query: query as never,
    executeQuery: executeQueryMock,
  };
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
        code: "QUERY_FAILED",
        cause: driverError,
      });
      // Never serialized
      expect(result.toJsonifiable().error).toStrictEqual({
        message: "Incorrect syntax near 'FROM'.",
        code: "QUERY_FAILED",
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
          code: "QUERY_FAILED",
          statusCode: 500,
          cause: driverError,
        })
      );
      await expect(ds.queryOrThrow(query)).rejects.toThrow(QErrors.QueryFailed);
      await expect(ds.queryOneOrThrow(query)).rejects.toThrow(
        QErrors.QueryFailed
      );
    });

    it("should return an ABORTED error with the abort reason as cause", async () => {
      const controller = new AbortController();
      const reason = new DOMException("timed out", "TimeoutError");
      const { ds, query } = createQueryDatasource(() => {
        controller.abort(reason);
        return Promise.reject(new Error("driver aborted"));
      });

      const result = await ds.query(query, { signal: controller.signal });
      expect(result.error).toStrictEqual({
        message: "driver aborted",
        code: "ABORTED",
        cause: reason,
      });

      await expect(
        ds.queryOrThrow(query, { signal: controller.signal })
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Query aborted: driver aborted",
          code: "ABORTED",
          statusCode: 504,
          cause: reason,
        })
      );
      await expect(
        ds.queryOneOrThrow(query, { signal: controller.signal })
      ).rejects.toThrow(QErrors.Aborted);
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

  describe("queryOne", () => {
    it("should return the row when exactly one matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }] })
      );
      const { data, error } = await ds.queryOne(query);
      expect(error).toBeUndefined();
      expect(data).toStrictEqual({ id: 1 });
    });

    it("should return null when no row matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [] })
      );
      const { data, error } = await ds.queryOne(query);
      expect(error).toBeUndefined();
      expect(data).toBeNull();
    });

    it("should return a TOO_MANY_RESULTS error when more than one row matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
      );
      const { error } = await ds.queryOne(query);
      expect(error?.code).toBe("TOO_MANY_RESULTS");
    });
  });

  describe("queryOneOrThrow", () => {
    it("should return the row when exactly one matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }] })
      );
      const { data } = await ds.queryOneOrThrow(query);
      expect(data).toStrictEqual({ id: 1 });
    });

    it("should throw when no row matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [] })
      );
      await expect(ds.queryOneOrThrow(query)).rejects.toThrow(
        expect.objectContaining({
          name: "QNoResultError",
          message: "Expected exactly one row, received none",
          code: "NO_RESULT",
        })
      );
    });

    it("should throw when more than one row matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
      );
      await expect(ds.queryOneOrThrow(query)).rejects.toThrow(
        expect.objectContaining({
          name: "QTooManyResultsError",
          message: "Expected exactly one row, received 2",
          code: "TOO_MANY_RESULTS",
          rowCount: 2,
        })
      );
    });

    it("should throw with the driver error as cause when the query fails", async () => {
      const driverError = new Error("Incorrect syntax near 'FROM'.");
      const { ds, query } = createQueryDatasource(() =>
        Promise.reject(driverError)
      );
      await expect(ds.queryOneOrThrow(query)).rejects.toThrow(
        expect.objectContaining({
          message: "Query failed: Incorrect syntax near 'FROM'.",
          cause: driverError,
        })
      );
    });
  });

  describe("queryOne logging", () => {
    it("should log more than one row as a warning", async () => {
      const { ds, logger, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
      );
      await ds.queryOne(query, { name: "getBrand" });
      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        'Query "{queryName}" expected one row, received {rowCount}',
        expect.objectContaining({
          queryName: "getBrand",
          source: "kysely",
          method: "queryOne",
          sql: "SELECT 1",
          rowCount: 2,
        })
      );
    });

    it("should log no row at debug level", async () => {
      const { ds, logger, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [] })
      );
      await expect(ds.queryOne(query)).resolves.toMatchObject({
        data: null,
      });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Query "{queryName}" returned no row',
        expect.objectContaining({ method: "queryOne", rowCount: 0 })
      );
    });

    it("should not log row counts when the query fails", async () => {
      const { ds, logger, query } = createQueryDatasource(() =>
        Promise.reject(new Error("driver error"))
      );
      await ds.queryOne(query);
      expect(logger.error).toHaveBeenCalledOnce();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledOnce(); // "Executing query" only
    });

    it("should log nothing more when exactly one row matches", async () => {
      const { ds, logger, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }] })
      );
      await ds.queryOneOrThrow(query);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledOnce(); // "Executing query" only
    });

    it("should still log when a custom error replaces the default one", async () => {
      const { ds, logger, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
      );
      await expect(
        ds.queryOneOrThrow(query, {
          onTooManyResults: () => new Error("custom"),
        })
      ).rejects.toThrow("custom");
      expect(logger.warn).toHaveBeenCalledOnce();
    });
  });

  describe("queryOneOrThrow defaultValue", () => {
    it("should return the default value when no row matches", async () => {
      const { ds, query } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        {
          defaultOptions: {
            queryOneOrThrow: {
              onNoResult: () => new Error("default not found"),
            },
          },
        }
      );
      const defaultRow = { id: 0 };
      const { data } = await ds.queryOneOrThrow(query, {
        defaultValue: defaultRow,
      });
      expect(data).toBe(defaultRow);
    });

    it("should return the row when one matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }] })
      );
      const { data } = await ds.queryOneOrThrow(query, { defaultValue: null });
      expect(data).toStrictEqual({ id: 1 });
    });

    it("should still throw when more than one row matches", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
      );
      await expect(
        ds.queryOneOrThrow(query, { defaultValue: null })
      ).rejects.toThrow(
        expect.objectContaining({ name: "QTooManyResultsError" })
      );
    });
  });

  describe("defaultOptions.queryOneOrThrow", () => {
    const defaultOptions: KyselyDatasourceDefaultOptions = {
      queryOneOrThrow: {
        onNoResult: ({ error }) =>
          new Error("default not found", { cause: error }),
        onTooManyResults: ({ rowCount }) =>
          new Error(`default got ${rowCount}`),
      },
    };

    it("should throw the datasource default errors", async () => {
      const { ds: noneDs, query } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        { defaultOptions }
      );
      await expect(noneDs.queryOneOrThrow(query)).rejects.toThrow(
        expect.objectContaining({
          message: "default not found",
          cause: expect.objectContaining({ code: "NO_RESULT" }),
        })
      );
      // No row is not an error for queryOne()
      await expect(noneDs.queryOne(query)).resolves.toMatchObject({
        data: null,
      });

      const { ds: manyDs } = createQueryDatasource(
        () => Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] }),
        { defaultOptions }
      );
      await expect(manyDs.queryOneOrThrow(query)).rejects.toThrow(
        "default got 2"
      );
      // Not used by queryOne(), which never throws
      await expect(manyDs.queryOne(query)).resolves.toMatchObject({
        error: { code: "TOO_MANY_RESULTS" },
      });
    });

    it("should let query options override the datasource defaults", async () => {
      const { ds, query } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        { defaultOptions }
      );
      await expect(
        ds.queryOneOrThrow(query, {
          onNoResult: () => new Error("query not found"),
        })
      ).rejects.toThrow("query not found");
    });
  });

  describe("onError", () => {
    const failing = () => Promise.reject(new Error("driver error"));

    it("should throw the onError error on query failure", async () => {
      const { ds, query } = createQueryDatasource(failing);
      const onError = ({ error }: { error: Error }) =>
        new Error("custom", { cause: error });

      await expect(ds.queryOrThrow(query, { onError })).rejects.toThrow(
        expect.objectContaining({
          message: "custom",
          cause: expect.any(QErrors.QueryFailed),
        })
      );
      await expect(ds.queryOneOrThrow(query, { onError })).rejects.toThrow(
        expect.objectContaining({
          message: "custom",
          cause: expect.any(QErrors.QueryFailed),
        })
      );
    });

    it("should use the datasource defaults of the named method only", async () => {
      const { ds, query } = createQueryDatasource(failing, {
        defaultOptions: {
          queryOrThrow: { onError: () => new Error("queryOrThrow default") },
          queryOneOrThrow: {
            onError: () => new Error("queryOneOrThrow default"),
          },
        },
      });

      await expect(ds.queryOrThrow(query)).rejects.toThrow(
        "queryOrThrow default"
      );
      await expect(ds.queryOneOrThrow(query)).rejects.toThrow(
        "queryOneOrThrow default"
      );
      await expect(
        ds.queryOrThrow(query, { onError: () => new Error("option") })
      ).rejects.toThrow("option");
    });

    it("should not use onError for the row count errors", async () => {
      const { ds, query } = createQueryDatasource(() =>
        Promise.resolve({ rows: [] })
      );

      await expect(
        ds.queryOneOrThrow(query, { onError: () => new Error("custom") })
      ).rejects.toThrow(QErrors.NoResult);
    });
  });

  describe("inflightQueryAbortStrategy", () => {
    it("should use the datasource strategy for all query methods", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(
        () => Promise.resolve({ rows: [{ id: 1 }] }),
        {
          defaultOptions: {
            query: { inflightQueryAbortStrategy: "cancel query" },
          },
        }
      );
      const { signal } = new AbortController();

      await ds.queryOrThrow(query, { signal });
      await ds.queryOne(query, { signal });
      await ds.queryOneOrThrow(query, { signal });

      expect(executeQuery).toHaveBeenCalledTimes(3);
      for (const call of executeQuery.mock.calls) {
        expect(call).toStrictEqual([
          expect.anything(),
          { signal, inflightQueryAbortStrategy: "cancel query" },
        ]);
      }
    });

    it("should support the deprecated inflightQueryAbortStrategy param", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        // oxlint-disable-next-line typescript/no-deprecated -- testing the alias
        { inflightQueryAbortStrategy: "kill session" }
      );
      const { signal } = new AbortController();

      await ds.query(query, { signal });

      expect(executeQuery).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        signal,
        inflightQueryAbortStrategy: "kill session",
      });
    });

    it("should prefer defaultOptions over the deprecated param", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        {
          // oxlint-disable-next-line typescript/no-deprecated -- testing the alias
          inflightQueryAbortStrategy: "kill session",
          defaultOptions: {
            query: { inflightQueryAbortStrategy: "cancel query" },
          },
        }
      );
      const { signal } = new AbortController();

      await ds.query(query, { signal });

      expect(executeQuery).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        signal,
        inflightQueryAbortStrategy: "cancel query",
      });
    });

    it("should use the datasource strategy", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        {
          defaultOptions: {
            query: { inflightQueryAbortStrategy: "cancel query" },
          },
        }
      );
      const { signal } = new AbortController();

      await ds.query(query, { signal });

      expect(executeQuery).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        signal,
        inflightQueryAbortStrategy: "cancel query",
      });
    });

    it("should let a query override the datasource strategy", async () => {
      const { ds, query, executeQuery } = createQueryDatasource(
        () => Promise.resolve({ rows: [] }),
        {
          defaultOptions: {
            query: { inflightQueryAbortStrategy: "cancel query" },
          },
        }
      );
      const { signal } = new AbortController();

      await ds.query(query, {
        signal,
        inflightQueryAbortStrategy: "ignore query",
      });

      expect(executeQuery).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        signal,
        inflightQueryAbortStrategy: "ignore query",
      });
    });
  });

  describe("logParams", () => {
    it("should leave the params out of the logs when disabled", async () => {
      const secret = "secret-value";
      const logger = {
        debug: vi.fn<() => void>(),
        info: vi.fn<() => void>(),
        error: vi.fn<() => void>(),
        warn: vi.fn<() => void>(),
      };
      const query = {
        compile: vi
          .fn<() => { sql: string; parameters: unknown[] }>()
          .mockReturnValue({ sql: "SELECT @1 as v", parameters: [secret] }),
        stream: vi
          .fn<() => AsyncGenerator<{ v: string }>>()
          .mockImplementation(async function* rows() {
            yield { v: secret };
          }),
      };
      const ds = new KyselyDatasource({
        connection: {} as never,
        logger: logger as never,
        logParams: false,
      });
      // @ts-expect-error - access private to mock
      ds.db = {
        executeQuery: vi
          .fn<() => Promise<{ rows: unknown[] }>>()
          .mockResolvedValue({ rows: [{ v: secret }] }),
      };

      const { meta } = await ds.queryOrThrow(query as never);
      await Array.fromAsync(ds.stream(query as never));

      const logged = [
        ...logger.debug.mock.calls,
        ...logger.info.mock.calls,
      ] as unknown[][];
      expect(logged).toHaveLength(4);
      for (const [, properties] of logged) {
        expect(properties).not.toHaveProperty("params");
      }
      expect(JSON.stringify(logged)).not.toContain(secret);
      // Still available in the result meta
      expect(meta.getSpans()[0]).toMatchObject({ params: [secret] });
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
        expect.objectContaining({
          message: "Query failed: Connection lost",
          code: "QUERY_FAILED",
          cause: failure,
        })
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

    it("should throw a QErrors.Aborted when aborted", async () => {
      const controller = new AbortController();
      const { stream } = createStreamDatasource(async function* rows() {
        yield { id: 1 };
        controller.abort();
        throw new Error("Stream aborted");
      }, controller.signal);

      await expect(Array.fromAsync(stream)).rejects.toThrow(
        expect.objectContaining({
          message: "Query aborted: Stream aborted",
          code: "ABORTED",
          statusCode: 499,
          cause: expect.objectContaining({ name: "AbortError" }),
        })
      );
    });
  });
});
