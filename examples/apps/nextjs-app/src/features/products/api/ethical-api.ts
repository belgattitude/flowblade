import { useQuery } from '@tanstack/react-query';

import {
  type EthicalProduct,
  ethicalProducts,
} from '@/features/products/data/ethical-products.data';

export type SearchEthicalProductsParams = {
  brands?: string[];
};

export const getEthicalProducts = async (
  params: SearchEthicalProductsParams
): Promise<EthicalProduct[]> => {
  const { brands = [] } = params;
  return ethicalProducts.filter((product) => {
    if (brands.length > 0) {
      return brands.includes(product.brand);
    }
    return true;
  });
};

export const useEthicalProducts = (params: SearchEthicalProductsParams) => {
  return useQuery({
    queryKey: ['get-ethical-products', params],
    queryFn: () => {
      return getEthicalProducts(params);
    },
  });
};

export type EthicalBrand = {
  name: string;
};

export const getEthicalBrands = async (): Promise<EthicalBrand[]> => {
  const brands = new Set<string>();
  for (const { brand } of ethicalProducts) {
    if (!brands.has(brand)) {
      brands.add(brand);
    }
  }
  return [...brands].map((brand) => ({ name: brand }));
};

export const useEthicalBrands = () => {
  return useQuery({
    queryKey: ['get-ethical-brands'],
    queryFn: getEthicalBrands,
  });
};
