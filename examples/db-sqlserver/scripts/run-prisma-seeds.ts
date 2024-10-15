import { BrandSeeds } from '../seeds/dev/brand.seeds';
import { CurrencySeeds } from '../seeds/dev/currency.seeds';
import { LocaleSeeds } from '../seeds/dev/locale.seeds';
import { ProductSeeds } from '../seeds/dev/product.seeds';
import { CliLogger } from '../src/lib/logger/cli-logger';
import { PrismaClientSqlServer } from '../src/prisma';

const prisma = new PrismaClientSqlServer();
const logger = new CliLogger('Prisma Seeds');

async function runPrismaSeeds() {
  logger.log('info', `Start seeding (dev) ...`);
  const params = {
    prisma,
    logger,
  };

  await new LocaleSeeds(params).execute();
  await new CurrencySeeds(params).execute();
  await new BrandSeeds(params).execute();
  await new ProductSeeds(params).execute();

  logger.log('info', `Seeding finished.`);
}

await runPrismaSeeds()
  .catch((e) => {
    console.error(e);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
