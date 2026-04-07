import { describe, expect, it } from 'vitest';

import { duckDsnZodSchema } from './duck-dsn-zod-schema.ts';

describe('duckDsnParserZodSchema', () => {
  it('should parse a memory DSN', () => {
    const dsn = 'duckdb://memory/memory_db?compress=true';
    const result = duckDsnZodSchema.safeParse(dsn);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({
        type: 'memory',
        alias: 'memory_db',
        options: {
          compress: true,
        },
      });
    }
  });

  it('should parse a filesystem DSN', () => {
    const dsn =
      'duckdb://filesystem/main_db?path=/tmp/duckdb.db&accessMode=READ_WRITE&rowGroupSize=8192&blockSize=16384&encryptionKey=A2345678&encryptionCipher=CBC';
    const result = duckDsnZodSchema.safeParse(dsn);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({
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
      });
    }
  });

  it('should fail on invalid DSN format', () => {
    const dsn = 'invalid-dsn';
    const result = duckDsnZodSchema.safeParse(dsn);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toStrictEqual([
      {
        code: 'custom',
        message: 'Cannot parse DSN',
        path: [],
      },
    ]);
  });

  it('should fail on wrong option', () => {
    const dsn = 'duckdb://memory/memory_db?compress=AHAH';
    const result = duckDsnZodSchema.safeParse(dsn);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toStrictEqual([
      {
        code: 'invalid_type',
        expected: 'boolean',
        message: 'Invalid input: expected boolean, received string',
        path: ['options', 'compress'],
      },
    ]);
  });
});
