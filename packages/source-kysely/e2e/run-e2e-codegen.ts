import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { envE2EConfig } from './env.e2e.config';
import { execPrismaCliOrThrow } from './utils/prisma-cli.utils';

const schema = 'e2e/sql-server/db/schema-sql-server.e2e.prisma';
const env = {
  E2E_DB_AZURE_SQL_EDGE: envE2EConfig.sqlServer.dsn,
};
const ddlOutputFile = `${__dirname}/sql-server/db/ddl.generated.e2e.sql`;

execPrismaCliOrThrow({
  cmd: `yarn prisma generate --schema ${schema}`,
  env,
  errorMsg: 'Failed to generate kysely types for sqlserver schema',
});

const { stdout } = execPrismaCliOrThrow({
  cmd: `yarn prisma migrate diff --from-empty --to-schema-datamodel ${schema} --script`,
  env: {
    E2E_DB_AZURE_SQL_EDGE: envE2EConfig.sqlServer.dsn,
  },
  errorMsg: 'Failed to generate ddl sqlserver schema',
});

writeFileSync(ddlOutputFile, stdout, {
  encoding: 'utf8',
});
