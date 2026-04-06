import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { duckDsnValibotSchema } from './duck-dsn-valibot-schema.ts';

describe('duckDsnValibotSchema', () => {
  it('should parse a memory DSN', () => {
    const dsn = 'duckdb://memory/memory_db?compress=true';
    const result = v.safeParse(duckDsnValibotSchema, dsn);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toStrictEqual({
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
    const result = v.safeParse(duckDsnValibotSchema, dsn);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toStrictEqual({
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
    const result = v.safeParse(duckDsnValibotSchema, dsn);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe('Cannot parse DSN');
    }
  });

  it('should fail on wrong option', () => {
    const dsn = 'duckdb://memory/memory_db?compress=AHAH';
    const result = v.safeParse(duckDsnValibotSchema, dsn);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].path?.[0].key).toBe('options');
      expect(result.issues[0].path?.[1]!.key).toBe('compress');
    }
  });
});
