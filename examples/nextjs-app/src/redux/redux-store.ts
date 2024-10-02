import type { Action, ThunkAction } from '@reduxjs/toolkit';
import { combineSlices, configureStore } from '@reduxjs/toolkit';

export const reduxRootReducer = combineSlices();
// add slices here

export type ReduxRootState = ReturnType<typeof reduxRootReducer>;

// `makeStore` encapsulates the store configuration to allow
// creating unique store instances, which is particularly important for
// server-side rendering (SSR) scenarios. In SSR, separate store instances
// are needed for each request to prevent cross-request state pollution.
export const makeReduxStore = () => {
  return configureStore({
    reducer: reduxRootReducer,
    devTools: process.env.NODE_ENV !== 'production',
  });
};

// Infer the return type of `makeStore`
export type AppStore = ReturnType<typeof makeReduxStore>;

// Infer the `AppDispatch` type from the store itself
export type AppDispatch = AppStore['dispatch'];

export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  ReduxRootState,
  unknown,
  Action
>;
