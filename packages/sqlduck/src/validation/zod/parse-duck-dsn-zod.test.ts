import { describe } from 'vitest';

import type { DuckConnectionParams } from '../core/types.ts';
import { parseDuckDSNZod } from './parse-duck-dsn-zod.ts';

describe('parseDuckDsnZod', () => {
  const suite = [
    [
      'duckdb://memory/memory_db?compress=true',
      {
        type: 'memory',
        alias: 'memory_db',
        options: {
          compress: true,
        },
      },
    ],
    [
      'duckdb://memory/memory_db?compress=true',
      {
        type: 'memory',
        alias: 'memory_db',
        options: {
          compress: true,
        },
      },
    ],
    [
      'duckdb://filesystem/main_db?path=/tmp/duckdb.db&accessMode=READ_WRITE&rowGroupSize=8192&blockSize=16384&encryptionKey=A2345678&encryptionCipher=CBC',
      {
        type: 'filesystem',
        alias: 'main_db',
        path: '/tmp/duckdb.db',
        options: {
          accessMode: 'READ_WRITE',
          blockSize: 16_384,
          encryptionCipher: 'CBC',
          encryptionKey: 'A2345678',
          rowGroupSize: 8192,
        },
      },
    ],
  ] as [dsn: string, params: DuckConnectionParams][];
  it.each(suite)('should parse %s into %s ', (dsn, params) => {
    expect(parseDuckDSNZod(dsn)).toStrictEqual(params);
  });
});
