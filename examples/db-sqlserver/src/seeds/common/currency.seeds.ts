import { AbstractSeed } from '../../lib/AbstractSeed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonCurrencies from './currencies.json' with { type: 'json' };

const currencyData: (Prisma.CurrencyCreateInput & {
  translations: (typeof jsonCurrencies.currencies)[number]['translations'];
})[] = jsonCurrencies.currencies.map((currency) => {
  return {
    code: currency.iso_4217,
    numericCode: currency.numeric_code,
    nameNative: currency.native_name,
    nameNativePlural: currency.native_name_plural,
    rounding: String(currency.rounding),
    displayDecimals: currency.display_decimals,
    symbolNative: currency.native_symbol,
    symbol: currency.symbol,
    createdAt: new Date(),
    updatedAt: null,
    withdrawalAt: null,
    translations: currency.translations,
  };
});

export class CurrencySeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    for (const { translations, ...c } of currencyData) {
      const { code, numericCode, ...nonUnique } = c;
      const inserted = await this.prisma.currency.upsert({
        where: { code, numericCode },
        update: nonUnique,
        create: {
          ...c,
          translations: {
            createMany: {
              data: [
                {
                  createdAt: new Date(),
                  name: translations['fr-FR'].singular,
                  namePlural: translations['fr-FR'].plural,
                  localeCode: 'fr-FR',
                },
                {
                  createdAt: new Date(),
                  name: translations['en-US'].singular,
                  namePlural: translations['en-US'].plural,
                  localeCode: 'en-US',
                },
              ],
            },
          },
        },
      });
      this.log('UPSERT', `Currency ${inserted.code} ${inserted.id}`);
    }
  };
}
