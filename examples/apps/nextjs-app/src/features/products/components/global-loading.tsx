'use client';
import type { FC } from 'react';

import { useSelector } from '@/redux/redux-hooks';

export const GlobalLoading: FC = () => {
  const loadingAt = useSelector((state) => state.productFilters.loadingAt);
  if (loadingAt === null) {
    return null;
  }
  return (
    <div className={'text-yellow absolute top-0 '}>Loading {loadingAt}</div>
  );
};
