import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isEan13, isStringNonEmpty } from '@httpx/assert';

import { AbstractSeed } from '../../src/lib/abstract-seed';
import { parseJsonl } from '../../src/lib/parse-jsonl';

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
        name: p.name ?? p.n_en ?? p.n_fr ?? p.n_pt ?? 'Unknnown name',
        barcode_ean13: isEan13(p.code) ? p.code : null,
        brandName: isStringNonEmpty(p.brand) ? p.brand : null,
      };
    });

    this.log('UPSERT', `Will upsert ${products.length} products`);

    const result = await this.prisma.$queryRaw<
      {
        insertedId: number;
        insertedEan13: string;
      }[]
    >`
        DECLARE @jsonSeeds NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
        SET @jsonSeeds = ${JSON.stringify(products)};

        MERGE INTO [common].[product] as p
        USING (
          SELECT seed.reference, seed.name, seed.barcode_ean13, b.id as brand_id
          FROM OPENJSON(@jsonSeeds)
                        WITH (reference NVARCHAR(255), name NVARCHAR(255), barcode_ean13 CHAR(13), brandName NVARCHAR(255))
                 AS seed
                 LEFT OUTER JOIN [common].[brand] AS b ON brandName = b.name
        ) AS data (reference, name, barcode_ean13, brand_id)
        ON p.reference = data.reference
        WHEN MATCHED
          THEN UPDATE SET
                        name = data.name,
                        barcode_ean13 = data.barcode_ean13,
                        updated_at = CURRENT_TIMESTAMP
        WHEN NOT MATCHED
          THEN INSERT (reference, name, barcode_ean13, brand_id, created_at)
               VALUES (data.reference, data.name, data.barcode_ean13, data.brand_id, CURRENT_TIMESTAMP)
        OUTPUT INSERTED.id as insertedId, INSERTED.barcode_ean13 as insertedEan13;

    `;
    this.collectStats('Product', { totalAffected: result.length });
  };
}
