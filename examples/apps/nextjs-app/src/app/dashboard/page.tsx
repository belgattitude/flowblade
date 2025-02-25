import { ProductFiltersPanel } from '@/features/products/components/product-filters-panel';
import { ProductStatsPanel } from '@/features/products/components/product-stats-panel';

export const dynamic = 'force-dynamic';

export default async function DashboardRoute() {
  return (
    <>
      <ProductFiltersPanel />
      <ProductStatsPanel />
    </>
  );
}
