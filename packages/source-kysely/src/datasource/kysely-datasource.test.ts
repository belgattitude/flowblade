import { describe, expect, it, vi } from "vitest";

import { KyselyDatasource } from "./kysely-datasource";

const createStreamDatasource = (
  stream: () => AsyncGenerator<{ id: number }>
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
    stream: ds.stream(query as never, { name: "test-stream" }),
  };
};

describe(KyselyDatasource, () => {
  describe("stream", () => {
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
        expect.stringContaining('Streaming query "test-stream" executed in'),
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
        expect.stringContaining('Streaming query "test-stream" executed in'),
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
        'Streaming query "test-stream" failed: Connection lost',
        expect.objectContaining({ affectedRows: 1 })
      );
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
