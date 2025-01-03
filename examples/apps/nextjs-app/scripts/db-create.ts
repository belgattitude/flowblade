import { TediousConnUtils } from '@flowblade/source-kysely';
import { assertStringNonEmpty } from '@httpx/assert';

import { getScriptsEnv } from './get-scripts-env';

const env = getScriptsEnv() ?? {};

assertStringNonEmpty(env?.DB_FLOWBLADE_AZURE_SQL_EDGE_JDBC);

const tediousConfig = TediousConnUtils.fromJdbcDsn(
  env.DB_FLOWBLADE_AZURE_SQL_EDGE_JDBC
);

console.log({ tediousConfig });
