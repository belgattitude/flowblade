export { flowbladeLogtapeDuckdbConfig } from './config/flowblade-logtape-duckdb.config';
export type { DuckdbDatasourceParams } from './datasource/duckdb-datasource';
export { DuckdbDatasource } from './datasource/duckdb-datasource';
export { duckdbDefaultLogger } from './logger/duckdb-default-logger';

// re-export from @flowblade/sql-tag
export { sql, type SqlTag } from '@flowblade/sql-tag';

// re-export from @flowblade/core
export type { QError } from '@flowblade/core';
export { QResult } from '@flowblade/core';
