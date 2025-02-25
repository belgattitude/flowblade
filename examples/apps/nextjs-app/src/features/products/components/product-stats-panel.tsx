import type { FC } from 'react';

import { ProductGrid } from '@/features/products/components/product-grid';

export const ProductStatsPanel: FC = () => {
  return (
    <div className={'flex'}>
      <ProductGrid className={'h-[400px]'} />
    </div>
  );
};
