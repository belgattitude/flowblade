'use client';

import type { FC } from 'react';

import { useDispatch } from '@/redux/redux-hooks';

export const LoadingPlaceholder: FC = () => {
  const _dispatch = useDispatch();
  /*
  useEffect(() => {
    dispatch(productFiltersSlice.actions.startLoading());
  }, []);
  */

  return (
    <div className="bg-black text-3xl bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      Loading...
    </div>
  );
};
