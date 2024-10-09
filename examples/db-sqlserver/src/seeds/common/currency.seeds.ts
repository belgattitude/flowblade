import { AbstractSeed } from '../../lib/AbstractSeed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonCurrencies from './currencies.json' with { type: 'json' };

const currencyData: Prisma.CurrencyCreateInput[] =
  jsonCurrencies.currencies.map((currency) => {
    return {
      code: currency.iso_4217,
      numericCode: currency.numeric_code,
      nameNative: currency.native_name,
      nameNativePlural: currency.native_name_plural,
      rounding: currency.rounding,
      displayDecimals: currency.display_decimals,
      symbolNative: currency.native_symbol,
      symbol: currency.symbol,
      createdAt: new Date(),
      updatedAt: null,
      withdrawalAt: null,
    };
  });

export class CurrencySeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    for (const c of currencyData) {
      const { code, numericCode, ...nonUnique } = c;
      const inserted = await this.prisma.currency.upsert({
        where: { code: code!, numericCode: numericCode },
        update: nonUnique,
        create: c,
      });
      this.log('UPSERT', `Currency ${inserted.code}`);
    }
  };
}
