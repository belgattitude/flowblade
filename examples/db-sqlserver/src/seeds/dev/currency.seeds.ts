import { AbstractSeed } from '../../lib/abstract-seed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonCurrencies from './currency.seeds.json' with { type: 'json' };

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
    const mapCurrencyi18n = new Map<string, number>();
    for (const { translations: _translations, ...c } of currencyData) {
      const { code, numericCode, ...nonUnique } = c;
      const inserted = await this.prisma.currency.upsert({
        where: { code, numericCode },
        update: nonUnique,
        create: {
          ...c,
        },
      });
      this.log('UPSERT', `Currency ${inserted.code} ${inserted.id}`);
      mapCurrencyi18n.set(inserted.code, inserted.id);
    }

    const locales = await this.prisma.locale.findMany();
    const mapLocales = new Map<string, number>();
    for (const locale of locales) {
      mapLocales.set(locale.code, locale.id);
    }

    for (const { translations, code: currencyCode } of currencyData) {
      const currencyId = mapCurrencyi18n.get(currencyCode)!;
      for (const [localeCode, value] of Object.entries(translations)) {
        if (mapLocales.has(localeCode)) {
          const localeId = mapLocales.get(localeCode)!;
          const { singular: name, plural: namePlural } = value;

          const _result = await this.prisma.$executeRaw`
            MERGE INTO [common].[currency_i18n] as i18n
            USING ( 
              VALUES (${currencyId}, ${localeId}, ${name}, ${namePlural})
            ) AS data (currency_id, locale_id, name, name_plural) 
            ON i18n.currency_id = data.currency_id 
               AND i18n.locale_id = data.locale_id           
            WHEN MATCHED 
              THEN UPDATE SET 
                   name = data.name, 
                   name_plural = data.name_plural, 
                   updated_at = CURRENT_TIMESTAMP 
            WHEN NOT MATCHED 
              THEN INSERT (currency_id, locale_id, name, name_plural, created_at) 
                   VALUES (data.currency_id, data.locale_id, data.name, data.name_plural, CURRENT_TIMESTAMP);       
          `;
          this.log(
            'UPSERT',
            `CurrencyI18n ${currencyCode} ${localeCode} - ${name}`
          );
        }
      }
    }
  };
}
