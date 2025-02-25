import {
  asyncThunkCreator,
  buildCreateSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { EthicalBrand } from '../server/ethical-product.repo';

export type ProductFiltersState = {
  data: { brands: EthicalBrand[] };
  selection: { brands: EthicalBrand[] };
};
export const productFiltersInitialState: ProductFiltersState = {
  data: {
    brands: [],
  },
  selection: {
    brands: [],
  },
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
        state.selection.brands = action.payload;
      }
    ),
  }),
});
