import { PrismaClientSqlServer } from '../src/prisma';
import { CurrencySeeds } from '../src/seeds/common/currency.seeds';
import { LanguageSeeds } from '../src/seeds/common/language.seeds';

const prisma = new PrismaClientSqlServer();

async function runPrismaSeeds() {
  console.log(`Start seeding ...`);

  await new LanguageSeeds(prisma).execute();
  await new CurrencySeeds(prisma).execute();

  console.log(`Seeding finished.`);
}

await runPrismaSeeds()
  .catch((e) => {
    console.error(e);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  })
  // eslint-disable-next-line sonarjs/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
