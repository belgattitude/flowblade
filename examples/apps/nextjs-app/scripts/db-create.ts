import { config as loadEnv } from "@dotenvx/dotenvx";
import { TediousConnUtils } from "@flowblade/source-kysely";
import { assertStringNonEmpty } from "@httpx/assert";

loadEnv({
  ignore: ["MISSING_ENV_FILE"],
  path: [".env.local", ".env.development", ".env"],
});

const jdbcDsn = process.env.DB_FLOWBLADE_MSSQL_JDBC;

assertStringNonEmpty(jdbcDsn);

const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

console.log({ tediousConfig });
