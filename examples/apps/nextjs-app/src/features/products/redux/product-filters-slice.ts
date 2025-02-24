import {
  asyncThunkCreator,
  buildCreateSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { EthicalBrand } from '@/features/products/api/ethical-api';

export type ProductFiltersState = {
  brands: EthicalBrand[];
  selectedBrands: EthicalBrand[];
};
export const productFiltersInitialState: ProductFiltersState = {
  brands: [],
  selectedBrands: [],
};

export const createProductFiltersSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});

export const productFiltersSlice = createProductFiltersSlice({
  name: 'productFilters',
  initialState: productFiltersInitialState,
  reducers: (create) => ({
    brandSelected: create.reducer(
      (state, action: PayloadAction<EthicalBrand[]>) => {
        state.selectedBrands = action.payload;
      }
    ),
  }),
});
