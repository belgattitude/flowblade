import type { DuckDBConnection } from '@duckdb/node-api';
import { afterEach, beforeEach, describe } from 'vitest';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';

import { DuckExtensionsManager } from './duck-extensions-manager.ts';

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
  describe('search', () => {
    it('should return installed extension', async () => {
      const extManager = new DuckExtensionsManager(conn);
      const extensions = await extManager.search({
        installed: true,
        name: 'core_functions',
      });
      expect(extensions).toStrictEqual([
        {
          description: expect.stringMatching(/.+/),
          extension_name: 'core_functions',
          installed: true,
        },
      ]);
    });
  });

  describe.sequential('install', () => {
    it('should force install an extension', async () => {
      const extManager = new DuckExtensionsManager(conn);
      const installed = await extManager.install('fts', {
        force: true,
      });
      expect(installed).toBe(true);
    });

    it('should install an extension', async () => {
      const extManager = new DuckExtensionsManager(conn);
      const installed = await extManager.install('fts', {
        force: true,
      });
      expect(installed).toBe(true);
    });

    it('should fail on invalid extension', async () => {
      const extManager = new DuckExtensionsManager(conn);
      // const installed = await extManager.install('not_existsing_extension');
      await expect(
        extManager.install('not_existing_extension')
      ).rejects.toThrow();
    });
  });
});
