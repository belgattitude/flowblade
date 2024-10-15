import { KyselyExecutor } from '@flowblade/source-kysely';

import { dbKyselySqlServer } from '@/server/config/db.kysely-sqlserver.config';

export const queryExecutor = new KyselyExecutor({
  connection: dbKyselySqlServer,
});
