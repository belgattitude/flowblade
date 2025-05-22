import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import type z from 'zod';

import { apiFetcher } from '@/config/api-fetcher.config.ts';
import type { EthicalProduct } from '@/features/products/data/ethical-products.data';
import type { EthicalBrand } from '@/features/products/server/ethical-product.repo';
import type { ethicalProductSearchRequestSchema } from '@/features/products/server/ethical-product.router';

type EthicalProductsParams = Omit<
  z.infer<typeof ethicalProductSearchRequestSchema.query>,
  'brands'
> & {
  brands?: string[];
};

export const getEthicalProducts = async (
  params: EthicalProductsParams
): Promise<EthicalProduct[]> => {
  const brands =
    Array.isArray(params.brands) && params.brands.length > 0
      ? params.brands.join(',')
      : undefined;

  return apiFetcher('product/ethical/search', {
    searchParams: {
      ...(brands ? { brands } : {}),
      slowdownApiMs: params.slowdownApiMs ?? 0,
    },
  }).json<EthicalProduct[]>();
};

export const getEthicalBrands = async (): Promise<EthicalBrand[]> => {
  return apiFetcher('product/ethical/brands', {}).json<EthicalBrand[]>();
};

export const useEthicalProducts = (params: EthicalProductsParams) => {
  return useQuery({
    queryKey: ['get-ethical-products', params],
    queryFn: () => {
      return getEthicalProducts(params);
    },
  });
};

export const useSuspenseEthicalProducts = (params: EthicalProductsParams) => {
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
