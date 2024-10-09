import { AbstractSeed } from '../../lib/AbstractSeed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonLanguages from './languages.json' with { type: 'json' };

const languageData: Prisma.LanguageCreateInput[] = jsonLanguages.languages.map(
  (lang) => {
    return {
      locale: lang.locale_code,
      iso639_1: lang.iso_639_1,
      iso639_2: lang.iso_639_2,
      nameNative: lang.native_name,
      createdAt: new Date(),
      updatedAt: null,
    };
  }
);

export class LanguageSeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    for (const l of languageData) {
      const { iso639_1, iso639_2, ...nonUnique } = l;
      const inserted = await this.prisma.language.upsert({
        where: { iso639_1, iso639_2 },
        update: nonUnique,
        create: l,
      });
      this.log('UPSERT', `Language ${inserted.iso639_1}`);
    }
  };
}
