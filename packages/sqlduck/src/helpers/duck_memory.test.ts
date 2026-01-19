import type { DuckDBConnection } from '@duckdb/node-api';
import isInCi from 'is-in-ci';
import { beforeAll, describe } from 'vitest';

import { createDuckdbTestMemoryDb } from '../../tests/e2e/utils/create-duckdb-test-memory-db';
import { DuckMemory, duckMemoryTags } from './duck-memory';

const testTimeout = 10_000;

describe('DuckMemory tests', async () => {
  let conn: DuckDBConnection;
  beforeAll(async () => {
    conn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? '128M' : '256M',
      threads: 1,
    });
  });
  afterAll(() => {
    conn.closeSync();
  });

  describe('getAll', () => {
    it(
      'Should return info for all tags',
      async () => {
        const duckMem = new DuckMemory(conn);
        const rows = await duckMem.getAll();
        expect(rows.length).toBe(duckMemoryTags.length);
        expect(rows[0]).toMatchObject({
          tag: expect.any(String),
          memory_usage_bytes: 0n,
          temporary_storage_bytes: 0n,
        });
      },
      testTimeout
    );
    it(
      'Should respect order by',
      async () => {
        const duckMem = new DuckMemory(conn);
        const rows = await duckMem.getAll({
          orderBy: 'tag_desc',
        });
        expect(rows?.[0]?.tag).toBe('TRANSACTION');
      },
      testTimeout
    );
  });

  describe('getByTag', () => {
    it.each(duckMemoryTags)(
      'Should return infos for tag %s',
      async (tag) => {
        const duckMem = new DuckMemory(conn);
        const mem = await duckMem.getByTag(tag);
        expect(mem).toMatchObject({
          tag: tag,
          memory_usage_bytes: 0n,
          temporary_storage_bytes: 0n,
        });
      },
      testTimeout
    );
  });

  describe('getSummary', () => {
    it(
      'Should return summary info',
      async () => {
        const duckMem = new DuckMemory(conn);
        const summary = await duckMem.getSummary();
        expect(summary).toStrictEqual({
          totalMB: 0,
          totalTempMB: 0,
        });
      },
      testTimeout
    );
  });
});
