import {
  type EthicalProduct,
  ethicalProducts,
} from '@/features/products/data/ethical-products.data';

export type SearchEthicalProductsParams = {
  brands?: string[];
};

export type EthicalBrand = {
  name: string;
};

export class EthicalProductRepo {
  search = async (
    params: SearchEthicalProductsParams
  ): Promise<EthicalProduct[]> => {
    const { brands = [] } = params;
    return ethicalProducts.filter((product) => {
      if (Array.isArray(brands) && brands.length > 0) {
        return brands.includes(product.brand);
      }
      return true;
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
