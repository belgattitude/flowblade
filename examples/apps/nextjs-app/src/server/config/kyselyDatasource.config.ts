import { KyselyDatasource } from '@flowblade/source-kysely';

import { dbKyselySqlServer } from '@/server/config/db.kysely-sqlserver.config';

export const kyselyDatasource = new KyselyDatasource({
  connection: dbKyselySqlServer,
});
