import * as v from 'valibot';

import { ethicalProducts } from '@/features/products/data/ethical-products.data';
import { vPipeDelimitedStringSchema } from '@/lib/valibot/valibot-openapi-extras';

export type SearchEthicalProductsParams = {
  brands?: string[];
};

export type EthicalBrand = {
  name: string;
};

export const ethicalProductSearchParamsSchema = v.object({
  brands: v.optional(vPipeDelimitedStringSchema),
  minPrice: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => Number.parseFloat(val)),
      v.number()
    )
  ),
});

export type EthicalProductSearchParams = v.InferOutput<
  typeof ethicalProductSearchParamsSchema
>;

export const ethicalProductSchema = v.object({
  label: v.pipe(
    v.string(),
    v.metadata({
      description: 'The name of the product',
    })
  ),
  brand: v.pipe(
    v.string(),
    v.metadata({
      description: 'The brand of the product',
    })
  ),
  price: v.number(),
  stock: v.number(),
  weight: v.string(),
  color: v.string(),
  category: v.string(),
});

export type EthicalProduct = v.InferOutput<typeof ethicalProductSchema>;

export class EthicalProductRepo {
  search = async (
    params: EthicalProductSearchParams
  ): Promise<EthicalProduct[]> => {
    const { brands, minPrice } = params;

    return ethicalProducts.filter((product) => {
      let matching = true;
      if (Array.isArray(brands) && brands.length > 0) {
        matching = matching && brands.includes(product.brand);
      }
      if (minPrice !== undefined) {
        matching = matching && product.price >= minPrice;
      }
      return matching;
    });
  };
  getBrands = async (): Promise<EthicalBrand[]> => {
    const brands = new Set<string>();
    for (const { brand } of ethicalProducts) {
      if (!brands.has(brand)) {
        brands.add(brand);
      }
    }
    return [...brands].map((brand) => ({ name: brand }));
  };
}
