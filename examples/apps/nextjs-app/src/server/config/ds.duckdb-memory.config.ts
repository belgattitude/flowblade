import { DuckdbDatasource } from '@flowblade/source-duckdb';

import { dbDuckDbMemoryConn } from './db.duckdb-memory.config';

export const dsDuckdbMemory = new DuckdbDatasource({
  connection: dbDuckDbMemoryConn,
});
