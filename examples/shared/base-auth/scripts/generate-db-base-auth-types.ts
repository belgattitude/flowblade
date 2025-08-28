import { config as loadEnv } from '@dotenvx/dotenvx';
import type { Kysely } from 'kysely';
import { generate, getDialect } from 'kysely-codegen';
import pc from 'picocolors';

import { dbBaseAuthConfig } from '../src';
import { createDbBaseAuthConn } from '../src/create-db-base-auth-conn';

loadEnv({
  path: ['.env.local', '.env.development', '.env'],
  ignore: ['MISSING_ENV_FILE'],
});

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

const closeDbAndExit = async (
  exitCode: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conn: Kysely<any>
): Promise<never> => {
  await conn.destroy();
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(exitCode);
};

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
  await closeDbAndExit(1, conn);
} finally {
  await conn.destroy();
}

console.info(`- ${pc.green('success')} Successfully saved types in ${outFile}`);
await closeDbAndExit(0, conn);
