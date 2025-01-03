// This file serves as a central hub for re-exporting pre-typed Redux hooks.
import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
  useStore as useReduxStore,
} from 'react-redux';

import type { AppDispatch, AppStore, ReduxRootState } from './redux-store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
export const useSelector = useReduxSelector.withTypes<ReduxRootState>();
export const useStore = useReduxStore.withTypes<AppStore>();
