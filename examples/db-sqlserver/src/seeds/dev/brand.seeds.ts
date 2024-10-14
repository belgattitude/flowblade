import { AbstractSeed } from '../../lib/abstract-seed';
import type { PrismaSqlServer as Prisma } from '../../prisma';
import jsonBrands from './brand.seeds.openfoodfact.json' with { type: 'json' };

export class BrandSeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    const brandData: Prisma.BrandCreateInput[] = jsonBrands.map((brand) => {
      return {
        name: brand.name,
        createdAt: new Date(),
        updatedAt: null,
      };
    });

    for (const b of brandData) {
      const { name, ...nonUnique } = b;
      const inserted = await this.prisma.brand.upsert({
        where: { name },
        update: {
          ...nonUnique,
          updatedAt: new Date(),
        },
        create: b,
      });
      this.log('UPSERT', `Brand ${inserted.id} - ${inserted.name}`);
    }
  };
}
