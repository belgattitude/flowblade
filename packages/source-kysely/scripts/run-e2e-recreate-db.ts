import { envE2EConfig } from '../e2e/env.e2e.config';
import { execPrismaCliOrThrow } from '../e2e/utils/prisma-cli.utils';

const { schema } = envE2EConfig.sqlServer.prisma;

const output = execPrismaCliOrThrow({
  cmd: `yarn prisma db push --schema=${schema} --force-reset`,
  env: {
    E2E_DB_AZURE_SQL_EDGE: envE2EConfig.sqlServer.dsn,
  },
  errorMsg: 'Failed to push latest schema',
});

console.log('Pushed latest schema');
console.log(output.stdout);
