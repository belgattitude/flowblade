import { KyselyDatasource } from '@flowblade/source-kysely';

import { dbKyselyMssql } from '@/server/config/db.kysely-mssql.config';

export const dsKyselyMssql = new KyselyDatasource({
  connection: dbKyselyMssql,
});
