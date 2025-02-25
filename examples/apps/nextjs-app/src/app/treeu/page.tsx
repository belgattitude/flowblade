import { ProductFiltersPanel } from '@/features/products/components/product-filters-panel';
import { ProductGrid } from '@/features/products/components/product-grid';

export const dynamic = 'force-dynamic';

export default function TreeuDemoRoute() {
  return (
    <div className={'flex flex-col w-full p-10 gap-5'}>
      <div className={'border'}>
        <ProductFiltersPanel className={'p-5'} />
      </div>
      <div className={'flex h-[400px] border'}>
        <ProductGrid className={'p-5'} />
      </div>
    </div>
  );
}
