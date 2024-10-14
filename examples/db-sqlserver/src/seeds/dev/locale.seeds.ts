import { AbstractSeed } from '../../lib/abstract-seed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonLocales from './locale.seeds.json' with { type: 'json' };

const localeData: Prisma.LocaleCreateInput[] = jsonLocales.locales.map(
  (lang) => {
    return {
      code: lang.locale_code,
      nameNative: lang.native_name,
      createdAt: new Date(),
      updatedAt: null,
    };
  }
);

export class LocaleSeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    for (const l of localeData) {
      const { code, ...nonUnique } = l;
      const inserted = await this.prisma.locale.upsert({
        where: { code },
        update: nonUnique,
        create: l,
      });
      this.log('UPSERT', `Language ${inserted.code}`);
    }
  };
}
