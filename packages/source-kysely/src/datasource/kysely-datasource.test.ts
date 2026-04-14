import { describe, expect, it, vi } from 'vitest';

import { KyselyDatasource } from './kysely-datasource';

describe('KyselyDatasource.stream logging', () => {
  it('should call logger.info even if stream is partially consumed', async () => {
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    const mockQuery = {
      compile: vi.fn().mockReturnValue({
        sql: 'SELECT * FROM test',
        parameters: [],
      }),
      stream: vi.fn().mockImplementation(async function* () {
        yield { id: 1 };
        yield { id: 2 };
        yield { id: 3 };
      }),
    };

    const ds = new KyselyDatasource({
      connection: {} as any, // db is only used for compile which we mocked
      logger: mockLogger as any,
    });

    // @ts-ignore - access private to mock
    ds.db = { executeQuery: vi.fn() };

    const stream = ds.stream(mockQuery as any, {
      name: 'test-stream',
    });

    // Partially consume the stream
    const first = await stream.next();
    expect(first.value).toEqual({ id: 1 });

    // Stop here and trigger generator return
    await stream.return!();

    // Check if logger.info was called
    // In the CURRENT implementation, this will FAIL
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Streaming query "test-stream" executed in'),
      expect.anything()
    );
  });
});
