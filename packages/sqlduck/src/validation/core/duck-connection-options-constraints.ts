/**
 * Constraints of the DuckDB connection options, keyed by option name.
 * Shared by the zod and valibot connection params schemas.
 */
export const duckConnectionOptionsConstraints = {
  accessMode: { values: ["READ_ONLY", "READ_WRITE"] },
  type: { values: ["DUCKDB", "SQLITE", "MYSQL", "PostgreSQL"] },
  blockSize: { min: 16_384, max: 262_144 },
  rowGroupSize: { min: 1 },
  storageVersion: {
    prefix: "v",
    pattern: /^v?\d{1,4}\.\d{1,4}\.\d{1,4}$/,
  },
  encryptionKey: { minLength: 8 },
  encryptionCipher: { values: ["CBC", "CTR", "GCM"] },
  recoveryMode: { values: ["no_wal_writes"] },
} as const;
