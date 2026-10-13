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

  describe("Error cause", () => {
    it("should keep the duckdb error as the error cause", async ({ ds }) => {
      const result = await ds.query(sql`SELECT FRM 1`);
      expect(result.error).toStrictEqual({
        message: expect.stringContaining("Parser Error"),
        cause: expect.any(Error),
      });
      // Never serialized
      expect(result.toJsonifiable().error).toStrictEqual({
        message: result.error?.message,
      });
    });

    it("should throw with the duckdb error as cause in queryOrThrow", async ({
      ds,
    }) => {
      const result = await ds.query(sql`SELECT FRM 1`);
      await expect(ds.queryOrThrow(sql`SELECT FRM 1`)).rejects.toThrow(
        expect.objectContaining({ cause: result.error?.cause })
      );
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
      expect(result.error?.message).toBe("This operation was aborted");
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
      ).rejects.toThrow("This operation was aborted");
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
      }).rejects.toThrow("This operation was aborted");
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
      ).rejects.toThrow(/Interrupted/);
      expect(Date.now() - start).toBeLessThan(5000);
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
