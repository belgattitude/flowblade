export const envE2EConfig = {
  sqlServer: {
    dsn: 'sqlserver://localhost:10433;database=master;user=sa;password=flowbladeE2E;trustServerCertificate=true;encrypt=false',
  },
} as const;
