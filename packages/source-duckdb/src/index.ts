export { flowbladeLogtapeDuckdbConfig } from "./config/flowblade-logtape-duckdb.config.ts";
export type { DuckdbDatasourceParams } from "./datasource/duckdb-datasource.ts";
export { DuckdbDatasource } from "./datasource/duckdb-datasource.ts";
export { duckdbDefaultLogtapeLogger } from "./logger/duckdb-default-logtape-logger.ts";

// re-export from @flowblade/sql-tag
export { sql, type SqlTag } from "@flowblade/sql-tag";

// re-export from @flowblade/core
export type { QError } from "@flowblade/core";
export { QResult } from "@flowblade/core";
