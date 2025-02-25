'use client';

import type { FC } from 'react';

import { ProductGrid } from '@/features/products/components/product-grid';
import { ReportBoundary } from '@/features/products/components/ReportBoundary';

export const ProductStatsPanel: FC = () => {
  return (
    <div className={'flex'}>
      <ReportBoundary>
        <ProductGrid className={'h-[400px]'} />
      </ReportBoundary>
    </div>
  );
};
