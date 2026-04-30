import type { DuckDBConnection } from '@duckdb/node-api';
import { afterEach, beforeEach, describe } from 'vitest';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';

import { DuckSettingsManager } from './duck-settings-manager.ts';

describe('DuckSettingsManagerTest', async () => {
  let conn: DuckDBConnection;
  beforeEach(async () => {
    conn = await createDuckdbTestMemoryDb({
      max_memory: '5M',
      threads: 1,
    });
  });
  afterEach(() => {
    conn.closeSync();
  });
  describe('getCurrentSettings', () => {
    it('should attach a memory database', async () => {
      const settingsManager = new DuckSettingsManager(conn);
      const currentSettings = await settingsManager.getCurrentSettings([
        'threads',
        'temp_directory',
      ]);
      expect(currentSettings).toStrictEqual({
        threads: '1',
        temp_directory: expect.stringMatching(/.+/),
      });
    });
  });
});
