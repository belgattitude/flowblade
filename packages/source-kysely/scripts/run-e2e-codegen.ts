import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { envE2EConfig } from '../e2e/env.e2e.config';
import { execPrismaCliOrThrow } from '../e2e/utils/prisma-cli.utils';

const { schema, env } = envE2EConfig.sqlServer.prisma;

const ddlOutputFile = `${__dirname}/../e2e/mssql/db/ddl.generated.e2e.sql`;

execPrismaCliOrThrow({
  cmd: `yarn prisma generate --schema ${schema}`,
  env,
  errorMsg: 'Failed to generate kysely types for sqlserver schema',
});

const migrate = execPrismaCliOrThrow({
  cmd: `yarn prisma migrate diff --from-empty --to-schema-datamodel ${schema} --script`,
  env: {
    E2E_DB_AZURE_SQL_EDGE: envE2EConfig.sqlServer.dsn,
  },
  errorMsg: 'Failed to generate ddl sqlserver schema',
});

writeFileSync(ddlOutputFile, migrate.stdout, {
  encoding: 'utf8',
});

console.log(`Generated DDL file: ${ddlOutputFile}`);
// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
