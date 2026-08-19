import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { EthicalBrand } from "../server/ethical-product.repo";

interface SearchFilters {
  brands: EthicalBrand[];
  slowdownApiMs: number;
}

export interface ProductFiltersState {
  loadingAt: number | null;
  data: { brands: EthicalBrand[] };
  /** Draft state - Current state of the filters before clicking execute */
  draftFilters: SearchFilters;
  /** Actual state - State of the filters when execute is clicked */
  filters: SearchFilters;
}
export const productFiltersInitialState: ProductFiltersState = {
  data: {
    brands: [],
  },
  draftFilters: {
    brands: [],
    slowdownApiMs: 0,
  },
  filters: {
    brands: [],
    slowdownApiMs: 0,
  },
  loadingAt: null,
};

export const createProductFiltersSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});

export const productFiltersSlice = createProductFiltersSlice({
  initialState: productFiltersInitialState,
  name: "productFilters",
  reducers: (create) => ({
    brandsFilterChanged: create.reducer(
      (state, action: PayloadAction<EthicalBrand[]>) => {
        state.draftFilters.brands = action.payload;
      }
    ),
    execute: create.reducer((state) => {
      state.filters = state.draftFilters;
    }),
    slowdownApiMsFilterChanged: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.draftFilters.slowdownApiMs = action.payload;
      }
    ),
    startLoading: create.reducer((state) => {
      state.loadingAt = Date.now();
    }),
  }),
});
