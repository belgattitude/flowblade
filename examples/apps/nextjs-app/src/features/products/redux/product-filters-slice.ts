import {
  asyncThunkCreator,
  buildCreateSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { EthicalBrand } from '../server/ethical-product.repo';

type SelectedFilters = {
  brands: EthicalBrand[];
};

export type ProductFiltersState = {
  loadingAt: number | null;
  data: { brands: EthicalBrand[] };
  /** DRAFT - Current state of the filters */
  internalSelection: SelectedFilters;
  /** ACTUAL - Report state */
  filters: SelectedFilters;
};
export const productFiltersInitialState: ProductFiltersState = {
  loadingAt: null,
  data: {
    brands: [],
  },
  internalSelection: {
    brands: [],
  },
  filters: {
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
        state.internalSelection.brands = action.payload;
      }
    ),
    startLoading: create.reducer((state) => {
      state.loadingAt = Date.now();
    }),
    execute: create.reducer((state) => {
      state.filters = state.internalSelection;
    }),
  }),
});
