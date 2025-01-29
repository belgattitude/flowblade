import { DuckdbDemoPage } from '@/features/demo/duckdb/pages/DuckdbDemo.page';

export const dynamic = 'force-dynamic';

export default async function DemoDuckdbRoute() {
  return <DuckdbDemoPage />;
}
