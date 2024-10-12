import { PrismaClientSqlServer } from '../src/prisma';
import { CurrencySeeds } from '../src/seeds/common/currency.seeds';
import { LocaleSeeds } from '../src/seeds/common/locale.seeds';

const prisma = new PrismaClientSqlServer();

async function runPrismaSeeds() {
  console.log(`Start seeding ...`);

  await new LocaleSeeds(prisma).execute();
  await new CurrencySeeds(prisma).execute();

  console.log(`Seeding finished.`);
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
