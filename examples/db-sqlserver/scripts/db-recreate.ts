import { CliLogger } from '../src/lib/logger/cli-logger';
import { PrismaDdl } from '../src/lib/PrismaDdl';
import { PrismaClientSqlServer } from '../src/prisma';

const logger = new CliLogger('create-ddl');
const prismaDdl = new PrismaDdl(logger);
const prisma = new PrismaClientSqlServer();

try {
  const ddl = prismaDdl.getDdl();
  const statements = ddl.split(/GO/);
  for (const stmt of statements) {
    console.log(stmt);
    await prisma.$executeRawUnsafe(`${stmt}`);
  }
} catch (e) {
  logger.log('error', (e as Error).message);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}
