import { PrismaClientSqlServer } from '../src/prisma';
import { CurrencySeeds } from '../src/seeds/common/currency.seeds';

const prisma = new PrismaClientSqlServer();

async function runPrismaSeeds() {
  console.log(`Start seeding ...`);

  const companySeeds = new CurrencySeeds(prisma);
  await companySeeds.execute();

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
