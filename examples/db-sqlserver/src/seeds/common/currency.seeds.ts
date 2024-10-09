import { AbstractSeed } from '../../lib/AbstractSeed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonCurrencies from './currencies.json';

const currencyData: Prisma.CurrencyCreateInput[] = jsonCurrencies.map(
  (currency) => {
    return {
      code: currency.code,
      name: currency.name,
      name_plural: currency.name_plural,
      rounding: currency.rounding,
      display_decimals: currency.decimal_digits,
      symbol_native: currency.symbol_native,
      symbol: currency.symbol,
      createdAt: new Date(),
      updatedAt: null,
      withdrawalAt: null,
    };
  }
);

export class CurrencySeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    for (const c of currencyData) {
      const { code, ...userNonUnique } = c;
      const inserted = await this.prisma.currency.upsert({
        where: { code: code! },
        update: userNonUnique,
        create: c,
      });
      this.log('UPSERT', `Currency ${inserted.code}`);
    }
  };
}
