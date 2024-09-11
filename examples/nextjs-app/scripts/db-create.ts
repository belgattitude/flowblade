import { ConnectionUtils } from '@flowblade/source-kysely';

import { getScriptsEnv } from './get-scripts-env';

const env = getScriptsEnv() ?? {};

const tediousConfig = ConnectionUtils.jdbcToTediousConfig(
  env.DB_FLOWBLADE_AZURE_SQL_EDGE_JDBC
);

console.log({ tediousConfig });
