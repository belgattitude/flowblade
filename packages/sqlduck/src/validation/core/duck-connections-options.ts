export const duckConnectionsOptions = {
  types: ['DUCKDB', 'SQLITE', 'MYSQL', 'PostgreSQL'],
  accessModes: ['READ_ONLY', 'READ_WRITE'],
  encryptionCiphers: ['CBC', 'CTR', 'GCM'],
} as const;
