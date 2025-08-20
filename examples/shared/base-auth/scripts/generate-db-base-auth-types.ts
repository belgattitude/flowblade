import { generate, getDialect } from 'kysely-codegen';
import pc from 'picocolors';

import { dbBaseAuthConfig } from '../src';
import { createDbBaseAuthConn } from '../src/create-db-base-auth-conn';

const jdbcDsn = process.env.DB_BASE_AUTH_JDBC_URL ?? '';
const outFile = 'src/generated/db-base-auth.kysely.types.ts';

console.info(
  `- ${pc.yellow('info')} Introspecting database schema JDBC DSN: ${pc.cyan(jdbcDsn)}`
);

const conn = createDbBaseAuthConn({
  jdbcDsn,
  skipSchemaPlugin: true, // we don't want the schema plugin for this introspection
  poolOptions: {
    min: 0,
    max: 2,
  },
});

try {
  await generate({
    db: conn,
    dialect: getDialect('mssql'),
    // the `base_auth.` schema is the one containing the data, unexisting is a hack
    // to only filter dc.* schema.
    defaultSchemas: ['unexisting'],
    includePattern: `${dbBaseAuthConfig.schema}.*`,
    outFile,
  });
} catch (e) {
  console.error(`- ${pc.red('error')} ${(e as Error).message}`);
  console.error(e);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
} finally {
  await conn.destroy();
}
console.info(`- ${pc.green('success')} Successfully saved types in ${outFile}`);
// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
