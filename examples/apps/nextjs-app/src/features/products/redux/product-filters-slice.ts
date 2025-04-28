import {
  asyncThunkCreator,
  buildCreateSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { EthicalBrand } from '../server/ethical-product.repo';

type SearchFilters = {
  brands: EthicalBrand[];
  slowdownApiMs: number;
};

export type ProductFiltersState = {
  loadingAt: number | null;
  data: { brands: EthicalBrand[] };
  /** Draft state - Current state of the filters before clicking execute */
  draftFilters: SearchFilters;
  /** Actual state - State of the filters when execute is clicked */
  filters: SearchFilters;
};
export const productFiltersInitialState: ProductFiltersState = {
  loadingAt: null,
  data: {
    brands: [],
  },
  draftFilters: {
    slowdownApiMs: 0,
    brands: [],
  },
  filters: {
    slowdownApiMs: 0,
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
    brandsFilterChanged: create.reducer(
      (state, action: PayloadAction<EthicalBrand[]>) => {
        state.draftFilters.brands = action.payload;
      }
    ),
    slowdownApiMsFilterChanged: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.draftFilters.slowdownApiMs = action.payload;
      }
    ),
    startLoading: create.reducer((state) => {
      state.loadingAt = Date.now();
    }),
    execute: create.reducer((state) => {
      state.filters = state.draftFilters;
    }),
  }),
});
