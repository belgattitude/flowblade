'use client';

import { type FC, useEffect } from 'react';

import { productFiltersSlice } from '@/features/products/redux/product-filters-slice';
import { useDispatch } from '@/redux/redux-hooks';

export const LoadingPlaceholder: FC = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    console.log('#####');
    dispatch(productFiltersSlice.actions.startLoading());
  }, [Math.random()]);
  console.log('cool');
  // dispatch(productFiltersSlice.actions.startLoading());
  return (
    <div className="bg-black text-3xl bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      Loading...
    </div>
  );
};
