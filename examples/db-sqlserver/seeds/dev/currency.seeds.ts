import { AbstractSeed } from '../../src/lib/abstract-seed';
import type { PrismaSqlServer as Prisma } from '../../src/prisma';
import jsonCurrencies from './currency.seeds.json' with { type: 'json' };

export class CurrencySeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    const currencyData: (Prisma.CurrencyCreateInput & {
      translations: (typeof jsonCurrencies.currencies)[number]['translations'];
    })[] = jsonCurrencies.currencies.map((currency) => {
      return {
        code: currency.iso_4217,
        numericCode: currency.numeric_code,
        name: currency.native_name,
        namePlural: currency.native_name_plural,
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

    const mapCurrencyi18n = new Map<string, number>();
    for (const { translations: _translations, ...c } of currencyData) {
      const { code, numericCode, ...nonUnique } = c;
      const inserted = await this.prisma.currency.upsert({
        where: { code, numericCode },
        update: {
          ...nonUnique,
          updatedAt: new Date(),
        },
        create: {
          ...c,
        },
      });
      this.log('UPSERT', `Currency ${inserted.code} ${inserted.id}`);
      mapCurrencyi18n.set(inserted.code, inserted.id);
    }

    const locales = await this.prisma.locale.findMany({
      select: {
        locale: true,
      },
    });
    const availableLocales = new Set(locales.map((row) => row.locale));

    for (const { translations, code: currencyCode } of currencyData) {
      const currencyId = mapCurrencyi18n.get(currencyCode)!;
      for (const [localeCode, value] of Object.entries(translations)) {
        if (availableLocales.has(localeCode)) {
          const { singular: name, plural: namePlural } = value;
          const _result = await this.prisma.$executeRaw`
            MERGE INTO [common].[currency_i18n] as i18n
            USING ( 
              VALUES (${currencyId}, ${localeCode}, ${name}, ${namePlural})
            ) AS data (currency_id, locale, name, name_plural) 
            ON i18n.currency_id = data.currency_id 
               AND i18n.locale = data.locale           
            WHEN MATCHED 
              THEN UPDATE SET 
                   name = data.name, 
                   name_plural = data.name_plural, 
                   updated_at = CURRENT_TIMESTAMP 
            WHEN NOT MATCHED 
              THEN INSERT (currency_id, locale, name, name_plural, created_at) 
                   VALUES (data.currency_id, data.locale, data.name, data.name_plural, CURRENT_TIMESTAMP);       
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
