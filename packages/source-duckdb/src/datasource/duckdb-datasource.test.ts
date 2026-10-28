import type { QErrorFactory } from "@flowblade/core";
import {
  configure,
  getConsoleSink,
  type LogRecord,
  reset,
} from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";
import {
  afterEach,
  beforeEach,
  expect,
  expectTypeOf,
  describe,
  vi,
} from "vitest";

import { duckTest as it } from "../../tests/utils/duck-test.ts";
import {
  DuckdbDatasource,
  flowbladeLogtapeDuckdbConfig,
  QErrors,
  sql,
} from "../index.ts";

describe(DuckdbDatasource, () => {
  describe("query", () => {
    const params = {
      min: 10,
      max: 99,
      name: "test",
      createdAt: "2025-01-22T23:54:41.114Z",
    };

    type Row = { id: number; name: "test"; createdAt: Date };

    const rawSql = sql<Row>`
      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,100) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${params.name} as name,
             createdAt
             
      FROM products 
      WHERE productId BETWEEN ${params.min}::INTEGER AND ${params.max}::INTEGER
      AND createdAt < ${params.createdAt}::TIMESTAMPTZ
    `;

    it("should return expected data", async ({ ds }) => {
      const result = await ds.query(rawSql);
      const { data, error } = result;

      expect(error).toBeUndefined();
      expect.assert(data);
      expect(data).toHaveLength(90);
      expect(data).toMatchSnapshot();
      expectTypeOf(data).toEqualTypeOf<Row[]>();
    });

    it("should return expected meta", async ({ ds }) => {
      const result = await ds.query(rawSql);
      const { meta } = result;
      expect(meta.getSpans()).toHaveLength(1);
      expect(
        meta.getSpans().map((span) => {
          return {
            ...span,
            timeMs: 0,
          };
        })
      ).toMatchSnapshot();
    });
  });

  describe("queryOrThrow", () => {
    it("should not throw when the query is ok", async ({ ds }) => {
      const rawSql = sql<{ ok: number }>`SELECT 1 as ok`;
      const { data } = await ds.queryOrThrow(rawSql);
      expect(data).toStrictEqual([{ ok: 1 }]);
    });

    it("should throw when the query couldn't be executed", async ({ ds }) => {
      const rawSql = sql<{ ok: number }>`SELECT FRM 1`;
      await expect(
        ds.queryOrThrow(rawSql, {
          name: "nok query",
        })
      ).rejects.toThrow(
        'Query failed: Failed to extract statements: Parser Error: syntax error at or near "1"'
      );
    });
  });

  describe("queryOne", () => {
    type Row = { id: number };

    it("should return the row when exactly one matches", async ({ ds }) => {
      const { data, error } = await ds.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${5}::INTEGER`
      );
      expect(error).toBeUndefined();
      expect(data).toStrictEqual({ id: 5 });
      expectTypeOf(data).toEqualTypeOf<Row | null | undefined>();
    });

    it("should return null when no row matches", async ({ ds }) => {
      const result = await ds.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${50}::INTEGER`
      );
      if (result.error) {
        throw new Error("Should not fail");
      }
      expect(result.data).toBeNull();
      expectTypeOf(result.data).toEqualTypeOf<Row | null>();
    });

    it("should map the row", async ({ ds }) => {
      const result = await ds.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${5}::INTEGER`
      );
      const { data } = result.map((row) => {
        return { key: `key-${row.id}` };
      });
      expect(data).toStrictEqual({ key: "key-5" });
    });

    it("should return a TOO_MANY_RESULTS error when more than one row matches", async ({
      ds,
    }) => {
      const { error } = await ds.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 10)`
      );
      expect(error).toMatchObject({
        message: "Expected exactly one row, received 9",
        code: "TOO_MANY_RESULTS",
      });
      expect(error?.cause).toBeInstanceOf(QErrors.TooManyResults);
    });

    it("should return the query error when the query fails", async ({ ds }) => {
      const { error } = await ds.queryOne(sql<Row>`SELECT FRM 1`);
      expect(error?.code).toBe("QUERY_FAILED");
      expect(error?.message).toContain("Parser Error");
    });
  });

  describe("queryOneOrThrow", () => {
    type Row = { id: number };

    it("should return the row when exactly one matches", async ({ ds }) => {
      const { data, meta } = await ds.queryOneOrThrow(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${5}::INTEGER`
      );
      expect(data).toStrictEqual({ id: 5 });
      expect(meta.getSpans()).toHaveLength(1);
      expectTypeOf(data).toEqualTypeOf<Row>();
    });

    it("should throw when no row matches", async ({ ds }) => {
      await expect(
        ds.queryOneOrThrow(
          sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${50}::INTEGER`
        )
      ).rejects.toThrow(
        expect.objectContaining({
          name: "QNoResultError",
          message: "Expected exactly one row, received none",
          code: "NO_RESULT",
        })
      );
    });

    it("should throw when more than one row matches", async ({ ds }) => {
      await expect(
        ds.queryOneOrThrow(
          sql<Row>`SELECT range::INTEGER as id FROM range(1, 10)`
        )
      ).rejects.toThrow(
        expect.objectContaining({
          name: "QTooManyResultsError",
          message: "Expected exactly one row, received 9",
          code: "TOO_MANY_RESULTS",
          rowCount: 9,
        })
      );
    });

    it("should throw with the duckdb error as cause when the query fails", async ({
      ds,
    }) => {
      await expect(ds.queryOneOrThrow(sql<Row>`SELECT FRM 1`)).rejects.toThrow(
        expect.objectContaining({ cause: expect.any(Error) })
      );
    });
  });

  describe("queryOneOrThrow defaultValue", () => {
    type Row = { id: number };
    const noRow = sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${50}::INTEGER`;

    it("should return the default value when no row matches", async ({
      ds,
    }) => {
      const defaultRow = { id: 0, isDefault: true };
      const { data, meta } = await ds.queryOneOrThrow(noRow, {
        defaultValue: defaultRow,
      });
      expect(data).toBe(defaultRow);
      expect(meta.getSpans()).toHaveLength(1);
      expectTypeOf(data).toEqualTypeOf<
        Row | { id: number; isDefault: boolean }
      >();
    });

    it("should accept null as default value", async ({ ds }) => {
      const { data } = await ds.queryOneOrThrow(noRow, { defaultValue: null });
      expect(data).toBeNull();
      expectTypeOf(data).toEqualTypeOf<Row | null>();
    });

    it("should still throw when more than one row matches", async ({ ds }) => {
      await expect(
        ds.queryOneOrThrow(
          sql<Row>`SELECT range::INTEGER as id FROM range(1, 10)`,
          { defaultValue: null }
        )
      ).rejects.toBeInstanceOf(QErrors.TooManyResults);
    });
  });

  describe("defaultOptions.queryOneOrThrow", () => {
    type Row = { id: number };
    const noRow = sql<Row>`SELECT range::INTEGER as id FROM range(1, 10) WHERE id = ${50}::INTEGER`;
    const manyRows = sql<Row>`SELECT range::INTEGER as id FROM range(1, 10)`;

    it("should throw the datasource default errors", async ({ ds }) => {
      const customDs = new DuckdbDatasource({
        connection: ds.getConnection(),
        defaultOptions: {
          queryOneOrThrow: {
            onNoResult: ({ error }) =>
              new Error("default not found", { cause: error }),
            onTooManyResults: ({ rowCount }) =>
              new Error(`default got ${rowCount}`),
          },
        },
      });
      await expect(customDs.queryOneOrThrow(noRow)).rejects.toThrow(
        expect.objectContaining({
          message: "default not found",
          cause: expect.objectContaining({ code: "NO_RESULT" }),
        })
      );
      await expect(customDs.queryOneOrThrow(manyRows)).rejects.toThrow(
        "default got 9"
      );
      // Not used by queryOne(), which never throws
      const { error } = await customDs.queryOne(manyRows);
      expect(error?.code).toBe("TOO_MANY_RESULTS");
      // Overridden per query
      await expect(
        customDs.queryOneOrThrow(noRow, {
          onNoResult: () => new Error("query not found"),
        })
      ).rejects.toThrow("query not found");
    });
  });

  describe("onError", () => {
    const invalid = sql`SELECT FRM 1`;

    it("should throw the onError error on query failure", async ({ ds }) => {
      const onError = vi.fn<QErrorFactory>(
        ({ error }) => new Error("custom", { cause: error })
      );
      const expected = expect.objectContaining({
        message: "custom",
        cause: expect.any(QErrors.QueryFailed),
      });
      await expect(ds.queryOrThrow(invalid, { onError })).rejects.toThrow(
        expected
      );
      await expect(ds.queryOneOrThrow(invalid, { onError })).rejects.toThrow(
        expected
      );
      expect(onError).toHaveBeenCalledTimes(2);
    });

    it("should use the datasource defaults of the named method only", async ({
      ds,
    }) => {
      const customDs = new DuckdbDatasource({
        connection: ds.getConnection(),
        defaultOptions: {
          queryOrThrow: { onError: () => new Error("queryOrThrow default") },
          queryOneOrThrow: {
            onError: () => new Error("queryOneOrThrow default"),
          },
        },
      });
      await expect(customDs.queryOrThrow(invalid)).rejects.toThrow(
        "queryOrThrow default"
      );
      await expect(customDs.queryOneOrThrow(invalid)).rejects.toThrow(
        "queryOneOrThrow default"
      );
      await expect(
        customDs.queryOrThrow(invalid, { onError: () => new Error("option") })
      ).rejects.toThrow("option");
    });
  });

  describe("Error cause", () => {
    it("should keep the duckdb error as the error cause", async ({ ds }) => {
      const result = await ds.query(sql`SELECT FRM 1`);
      expect(result.error).toStrictEqual({
        message: expect.stringContaining("Parser Error"),
        code: "QUERY_FAILED",
        cause: expect.any(Error),
      });
      // Never serialized
      expect(result.toJsonifiable().error).toStrictEqual({
        message: result.error?.message,
        code: "QUERY_FAILED",
      });
    });

    it("should throw with the duckdb error as cause in queryOrThrow", async ({
      ds,
    }) => {
      const result = await ds.query(sql`SELECT FRM 1`);
      await expect(ds.queryOrThrow(sql`SELECT FRM 1`)).rejects.toThrow(
        expect.objectContaining({ cause: result.error?.cause })
      );
      await expect(ds.queryOrThrow(sql`SELECT FRM 1`)).rejects.toThrow(
        QErrors.QueryFailed
      );
      await expect(ds.queryOneOrThrow(sql`SELECT FRM 1`)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/^Query failed: .*Parser Error/),
          statusCode: 500,
        })
      );
      await expect(
        Array.fromAsync(ds.stream(sql`SELECT FRM 1`))
      ).rejects.toThrow(QErrors.QueryFailed);
    });
  });

  describe("Abort signal", () => {
    it("should interrupt an in-flight query", async ({ ds }) => {
      const start = Date.now();
      const result = await ds.query(
        sql`SELECT count(*) FROM range(100000000000) t1`,
        { signal: AbortSignal.timeout(100) }
      );
      expect(result.error?.message).toMatch(/Interrupted/);
      expect(result.error?.code).toBe("ABORTED");
      expect(result.error?.cause).toMatchObject({ name: "TimeoutError" });
      expect(() => result.getOrThrow()).toThrow(QErrors.Aborted);
      expect(() => result.getOrThrow()).toThrow(
        expect.objectContaining({ statusCode: 504 })
      );
      expect(Date.now() - start).toBeLessThan(5000);

      // The connection is still usable
      const { data } = await ds.queryOrThrow(
        sql<{ ok: number }>`SELECT 1 as ok`
      );
      expect(data).toStrictEqual([{ ok: 1 }]);
    });

    it("should not run the query when the signal is already aborted", async ({
      ds,
    }) => {
      const result = await ds.query(
        sql`CREATE TABLE aborted AS SELECT 1 as a`,
        {
          signal: AbortSignal.abort(),
        }
      );
      // The abort reason, its message differs between runtimes
      expect(result.error?.code).toBe("ABORTED");
      expect(result.error?.cause).toMatchObject({ name: "AbortError" });
      await expect(
        ds.queryOrThrow(sql`SELECT 1`, { signal: AbortSignal.abort() })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "ABORTED",
          statusCode: 499,
          cause: expect.objectContaining({ name: "AbortError" }),
        })
      );
      const { data } = await ds.queryOrThrow(
        sql<{
          count: number;
        }>`SELECT count(*)::INTEGER as count FROM duckdb_tables() WHERE table_name = 'aborted'`
      );
      expect(data).toStrictEqual([{ count: 0 }]);
    });
  });

  describe("stream", () => {
    type Row = { id: number; name: string };
    // More rows than a DuckDB chunk (2048)
    const rowsSql = sql<Row>`SELECT range::INTEGER as id, 'name-' || range as name FROM range(5000)`;

    const createLoggedDatasource = (ds: DuckdbDatasource) => {
      const logger = {
        debug: vi.fn<() => void>(),
        info: vi.fn<() => void>(),
        error: vi.fn<() => void>(),
        warn: vi.fn<() => void>(),
      };
      return {
        logger,
        loggedDs: new DuckdbDatasource({
          connection: ds.getConnection(),
          logger: logger as never,
        }),
      };
    };

    it("should stream the same rows as query", async ({ ds }) => {
      const streamed = await Array.fromAsync(ds.stream(rowsSql));
      const { data } = await ds.queryOrThrow(rowsSql);
      expect(streamed).toHaveLength(5000);
      expect(streamed).toStrictEqual(data);
      expectTypeOf(streamed).toEqualTypeOf<Row[]>();
    });

    it("should log the execution once the stream is fully consumed", async ({
      ds,
    }) => {
      const { logger, loggedDs } = createLoggedDatasource(ds);
      await Array.fromAsync(loggedDs.stream(rowsSql, { name: "rows" }));
      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
        expect.objectContaining({
          queryName: "rows",
          method: "stream",
          affectedRows: 5000,
        })
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should support leaving the stream early", async ({ ds }) => {
      const { logger, loggedDs } = createLoggedDatasource(ds);
      for await (const row of loggedDs.stream(rowsSql)) {
        expect(row).toStrictEqual({ id: 0, name: "name-0" });
        break;
      }
      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.objectContaining({ affectedRows: 1 })
      );
      // The connection is still usable
      const { data } = await ds.queryOrThrow(
        sql<{ ok: number }>`SELECT 1 as ok`
      );
      expect(data).toStrictEqual([{ ok: 1 }]);
    });

    it("should only log the error and throw with the duckdb error as cause when the query fails", async ({
      ds,
    }) => {
      const { logger, loggedDs } = createLoggedDatasource(ds);
      await expect(
        Array.fromAsync(loggedDs.stream(sql`SELECT FRM 1`, { name: "nok" }))
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Parser Error"),
          cause: expect.any(Error),
        })
      );
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Streaming query "{queryName}" failed: {errorMessage}',
        expect.objectContaining({
          queryName: "nok",
          errorMessage: expect.stringContaining("Parser Error"),
        })
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("should not run the query when the signal is already aborted", async ({
      ds,
    }) => {
      await expect(
        Array.fromAsync(
          ds.stream(sql`CREATE TABLE aborted_stream AS SELECT 1 as a`, {
            signal: AbortSignal.abort(),
          })
        )
      ).rejects.toThrow(
        expect.objectContaining({
          code: "ABORTED",
          cause: expect.objectContaining({ name: "AbortError" }),
        })
      );
      const { data } = await ds.queryOrThrow(
        sql<{
          count: number;
        }>`SELECT count(*)::INTEGER as count FROM duckdb_tables() WHERE table_name = 'aborted_stream'`
      );
      expect(data).toStrictEqual([{ count: 0 }]);
    });

    it("should stop between chunks when aborted", async ({ ds }) => {
      const controller = new AbortController();
      let received = 0;
      await expect(async () => {
        for await (const _row of ds.stream(rowsSql, {
          signal: controller.signal,
        })) {
          received++;
          controller.abort();
        }
      }).rejects.toThrow(
        expect.objectContaining({
          cause: expect.objectContaining({ name: "AbortError" }),
        })
      );
      // The rest of the first chunk is still yielded, not the next chunks
      expect(received).toBeLessThanOrEqual(2048);
      const { data } = await ds.queryOrThrow(
        sql<{ ok: number }>`SELECT 1 as ok`
      );
      expect(data).toStrictEqual([{ ok: 1 }]);
    });

    it("should interrupt a chunk being fetched when aborted", async ({
      ds,
    }) => {
      const start = Date.now();
      await expect(
        Array.fromAsync(
          ds.stream(sql`SELECT count(*) FROM range(100000000000) t1`, {
            signal: AbortSignal.timeout(100),
          })
        )
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/^Query aborted: .*Interrupted/),
          code: "ABORTED",
          statusCode: 504,
          cause: expect.objectContaining({ name: "TimeoutError" }),
        })
      );
      expect(Date.now() - start).toBeLessThan(5000);
    });
  });

  describe("queryOne logging", () => {
    type Row = { id: number };

    it("should log more than one row as a warning and no row at debug level", async ({
      ds,
    }) => {
      const logger = {
        debug: vi.fn<(message: string, properties?: unknown) => void>(),
        info: vi.fn<(message: string, properties?: unknown) => void>(),
        error: vi.fn<(message: string, properties?: unknown) => void>(),
        warn: vi.fn<(message: string, properties?: unknown) => void>(),
      };
      const loggedDs = new DuckdbDatasource({
        connection: ds.getConnection(),
        logger: logger as never,
      });

      await loggedDs.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 4)`,
        { name: "tooMany" }
      );
      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        'Query "{queryName}" expected one row, received {rowCount}',
        expect.objectContaining({
          queryName: "tooMany",
          source: "duckdb",
          method: "queryOne",
          rowCount: 3,
        })
      );

      await loggedDs.queryOne(
        sql<Row>`SELECT range::INTEGER as id FROM range(1, 4) WHERE id = ${50}::INTEGER`
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Query "{queryName}" returned no row',
        expect.objectContaining({ method: "queryOne", rowCount: 0 })
      );
      expect(logger.warn).toHaveBeenCalledOnce();
    });
  });

  describe("logParams", () => {
    it("should leave the params out of the logs when disabled", async ({
      ds,
    }) => {
      const logger = {
        debug: vi.fn<() => void>(),
        info: vi.fn<() => void>(),
        error: vi.fn<() => void>(),
        warn: vi.fn<() => void>(),
      };
      const secretDs = new DuckdbDatasource({
        connection: ds.getConnection(),
        logger: logger as never,
        logParams: false,
      });
      const secret = "secret-value";
      const query = sql<{ v: string }>`SELECT ${secret} as v`;

      const { meta } = await secretDs.queryOrThrow(query);
      await Array.fromAsync(secretDs.stream(query));

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

  describe("Logger", () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configure({
        sinks: {
          buffer: (record) => {
            logBuffer.push(record);
          },
          console: getConsoleSink({
            nonBlocking: {
              bufferSize: 1000, // Flush after 1000 records
              flushInterval: 50, // Flush every 50ms
            },
            formatter: prettyFormatter,
          }),
        },
        loggers: [
          {
            category: ["logtape", "meta"],
            lowestLevel: "error",
            sinks: ["console"],
          },
          {
            category: ["flowblade", "duckdb"],
            lowestLevel: "debug",
            sinks: ["buffer"],
          },
        ],
      });
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it("should log success", async ({ ds }) => {
      const { meta } = await ds.query(sql`SELECT 'test'`, {
        name: "TEST",
      });
      expect(logBuffer[0]).toMatchObject({
        category: flowbladeLogtapeDuckdbConfig.categories,
        level: "debug",
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', "TEST", '"'],
        properties: {
          queryName: "TEST",
          sql: "SELECT 'test'",
          params: [],
        },
      });
      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeDuckdbConfig.categories,
        level: "info",
        rawMessage:
          'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        message: [
          'Query "',
          "TEST",
          '" executed in ',
          meta.getTotalTimeMs(),
          "ms, affected ",
          1,
          " row(s)",
        ],
        properties: {
          queryName: "TEST",
          sql: "SELECT 'test'",
          params: [],
          affectedRows: 1,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });

    it("should log error", async ({ ds }) => {
      const { meta } = await ds.query(sql`SELECT err`, {
        name: "ERROR",
      });
      expect(logBuffer[0]).toMatchObject({
        category: flowbladeLogtapeDuckdbConfig.categories,
        level: "debug",
        rawMessage: 'Executing query "{queryName}"',
        message: ['Executing query "', "ERROR", '"'],
        properties: {
          queryName: "ERROR",
          sql: "SELECT err",
          params: [],
        },
      });
      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeDuckdbConfig.categories,
        level: "error",
        message: [
          'Query "',
          "ERROR",
          '" failed: ',
          expect.stringMatching(/^Binder(.*)FROM clause is missing/),
          "",
        ],
        rawMessage: 'Query "{queryName}" failed: {errorMessage}',
        properties: {
          queryName: "ERROR",
          errorMessage: expect.stringMatching(
            /^Binder(.*)FROM clause is missing/
          ),
          sql: "SELECT err",
          params: [],
          affectedRows: 0,
          timeMs: meta.getTotalTimeMs(),
        },
      });
    });
  });
});
