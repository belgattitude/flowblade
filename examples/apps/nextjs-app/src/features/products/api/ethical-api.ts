import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { apiFetcher } from '@/config/ky.config';
import type { EthicalProduct } from '@/features/products/data/ethical-products.data';
import type {
  EthicalBrand,
  SearchEthicalProductsParams,
} from '@/features/products/server/ethical-product.repo';

export const getEthicalProducts = async (
  params: SearchEthicalProductsParams
): Promise<EthicalProduct[]> => {
  const brands =
    Array.isArray(params.brands) && params.brands.length > 0
      ? params.brands.join(',')
      : undefined;

  return apiFetcher('product/ethical/search', {
    searchParams: {
      ...(brands ? { brands } : {}),
    },
  }).json<EthicalProduct[]>();
};

export const getEthicalBrands = async (): Promise<EthicalBrand[]> => {
  return apiFetcher('product/ethical/brands', {}).json<EthicalBrand[]>();
};

export const useEthicalProducts = (params: SearchEthicalProductsParams) => {
  return useQuery({
    queryKey: ['get-ethical-products', params],
    queryFn: () => {
      return getEthicalProducts(params);
    },
  });
};

export const useSuspenseEthicalProducts = (
  params: SearchEthicalProductsParams
) => {
  return useSuspenseQuery({
    queryKey: ['get-ethical-products', params],
    queryFn: () => {
      return getEthicalProducts(params);
    },
  });
};

export const useEthicalBrands = () => {
  return useQuery({
    queryKey: ['get-ethical-brands'],
    queryFn: getEthicalBrands,
  });
};

export const useSuspenseEthicalBrands = () => {
  return useSuspenseQuery({
    queryKey: ['get-ethical-brands'],
    queryFn: getEthicalBrands,
  });
};
