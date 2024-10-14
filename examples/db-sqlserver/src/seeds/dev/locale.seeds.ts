import { AbstractSeed } from '../../lib/abstract-seed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonLocales from './locale.seeds.json' with { type: 'json' };

export class LocaleSeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    const localeData: Prisma.LocaleCreateInput[] = jsonLocales.locales.map(
      (lang) => {
        return {
          locale: lang.locale_code,
          nameNative: lang.native_name,
          createdAt: new Date(),
          updatedAt: null,
        };
      }
    );

    for (const l of localeData) {
      const { locale, ...nonUnique } = l;
      const inserted = await this.prisma.locale.upsert({
        where: { locale },
        update: nonUnique,
        create: l,
      });
      this.log('UPSERT', `Language ${inserted.locale}`);
    }
  };
}
