export const duckConnectionsOptions = {
  types: ['DUCKDB', 'SQLITE', 'MYSQL', 'PostgreSQL'],
  accessModes: ['READ_ONLY', 'READ_WRITE'],
  encryptionCiphers: ['CBC', 'CTR', 'GCM'],
  recoveryMode: ['no_wal_writes'],
} as const;
