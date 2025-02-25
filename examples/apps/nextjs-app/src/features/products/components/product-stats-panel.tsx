'use client';

import type { FC } from 'react';

import { ProductGrid } from '@/features/products/components/product-grid';
import { ReportBoundary } from '@/features/products/components/report-boundary';

export const ProductStatsPanel: FC = () => {
  return (
    <div className={'flex-1 flex flex-col gap-5'}>
      <ReportBoundary>
        <ProductGrid className={'h-[400px]'} />
      </ReportBoundary>
      <ReportBoundary>
        <ProductGrid className={'h-[400px]'} />
      </ReportBoundary>
    </div>
  );
};
