import { BrandSeeds } from '../seeds/dev/brand.seeds';
import { CurrencySeeds } from '../seeds/dev/currency.seeds';
import { LocaleSeeds } from '../seeds/dev/locale.seeds';
import { ProductSeeds } from '../seeds/dev/product.seeds';
import type { AbstractSeed } from '../src/lib/abstract-seed';
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

  const seeds = [
    ['Locales', LocaleSeeds],
    ['Currency', CurrencySeeds],
    ['Brand', BrandSeeds],
    ['Product', ProductSeeds],
  ] as const satisfies [name: string, seedCls: typeof AbstractSeed][];

  const summary: { name: string; timeMs: number; totalAffected: number }[] = [];

  for (const [name, seedCls] of seeds) {
    logger.log('info', `Start seeding ${name} ...`);
    const start = performance.now();
    const seed = new seedCls(params);
    await seed.execute();
    const stats = seed.getStats();
    const totalAffected = stats.reduce(
      (acc, [, s]) => acc + s.totalAffected,
      0
    );
    const timeMs = performance.now() - start;
    summary.push({ name, timeMs: performance.now() - start, totalAffected });
    const inSeconds = Math.round(timeMs / 100) / 10;
    logger.log('info', `Seeded '${name}' in ${inSeconds} s...`);
  }

  logger.log('success', `Seeding finished, here's the summary:`);
  summary.forEach((s) => {
    const inSeconds = Math.round(s.timeMs / 100) / 10;
    const total = logger.log(
      'success',
      `[x] ${s.name.padEnd(12, '.')} - affected: ${String(s.totalAffected).padStart(7, '.')} - took ${inSeconds} s`
    );
  });
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
