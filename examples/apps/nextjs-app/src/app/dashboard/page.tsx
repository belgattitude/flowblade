import { ProductFiltersPanel } from '@/features/products/components/product-filters-panel';
import { ProductStatsPanel } from '@/features/products/components/product-stats-panel';

export default async function Page() {
  return (
    <>
      <ProductFiltersPanel />
      <ProductStatsPanel />
    </>
  );
}
