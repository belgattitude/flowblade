import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AbstractSeed } from '../../lib/abstract-seed';
import { parseJsonl } from '../../lib/parse-jsonl';

export class ProductSeeds extends AbstractSeed {
  execute = async (): Promise<void> => {
    const file = fileURLToPath(
      path.dirname(import.meta.url) + '/product.seeds.openfoodfact.jsonl'
    );

    type ProductSeeds = {
      code: string;
      name: string;
      lang: string | null;
      n_en: string | null;
      n_fr: string | null;
      n_pt: string | null;
      brand: string | null;
    };

    const productSeeds = await parseJsonl<ProductSeeds>(file);
    const products = productSeeds.map((p) => {
      return {
        reference: p.code,
        name: p.name,
        barco: p.name,
        brand: p.brand,
        createdAt: new Date(),
        updatedAt: null,
      };
    });
    console.log('products', products);
    return;

    for (const l of products) {
      const { reference, ...nonUnique } = l;
      const inserted = await this.prisma.product.upsert({
        where: { locale },
        update: {
          ...nonUnique,
          updatedAt: new Date(),
        },
        create: l,
      });
      this.log('UPSERT', `Language ${inserted.locale}`);
    }
  };
}
