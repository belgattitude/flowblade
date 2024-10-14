import { fileURLToPath } from 'node:url';

import { PrismaDdl } from '../src/lib/create-ddl';
import { CliLogger } from '../src/lib/logger/cli-logger';

const ddlOutputFile = fileURLToPath(
  import.meta.url + '/../../data/ddl/create-tables.generated.sql'
);

const logger = new CliLogger('create-ddl');
const ddl = new PrismaDdl(logger);

try {
  ddl.createDdlFile(ddlOutputFile);
} catch (e) {
  logger.log('error', (e as Error).message);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}
